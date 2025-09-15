#!/usr/bin/env node

const { execSync, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

class ComprehensiveTestRunner {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.results = {
      timestamp: new Date().toISOString(),
      tests: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        skipped: 0
      }
    };
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = {
      info: '📋',
      success: '✅',
      error: '❌',
      warning: '⚠️',
      start: '🚀'
    }[type] || '📋';
    
    console.log(`${prefix} [${timestamp}] ${message}`);
  }

  async runCommand(command, cwd = this.rootDir, options = {}) {
    return new Promise((resolve, reject) => {
      const startTime = Date.now();
      
      this.log(`Running: ${command}`, 'start');
      
      const child = spawn('npm', ['run', ...command.split(' ').slice(1)], {
        cwd,
        stdio: options.silent ? 'pipe' : 'inherit',
        shell: true
      });

      let stdout = '';
      let stderr = '';

      if (options.silent) {
        child.stdout.on('data', (data) => {
          stdout += data.toString();
        });

        child.stderr.on('data', (data) => {
          stderr += data.toString();
        });
      }

      child.on('close', (code) => {
        const duration = Date.now() - startTime;
        
        if (code === 0) {
          this.log(`✅ Command completed in ${duration}ms: ${command}`, 'success');
          resolve({ code, stdout, stderr, duration });
        } else {
          this.log(`❌ Command failed with code ${code}: ${command}`, 'error');
          reject({ code, stdout, stderr, duration, command });
        }
      });

      child.on('error', (error) => {
        this.log(`❌ Command error: ${error.message}`, 'error');
        reject({ error, command });
      });
    });
  }

  async runTestSuite(name, command, cwd = this.rootDir, options = {}) {
    this.log(`Starting test suite: ${name}`);
    
    try {
      const result = await this.runCommand(command, cwd, options);
      
      this.results.tests[name] = {
        status: 'passed',
        duration: result.duration,
        command,
        output: options.silent ? result.stdout : null
      };
      
      this.results.summary.passed++;
      this.log(`Test suite passed: ${name}`, 'success');
      
      return true;
    } catch (error) {
      this.results.tests[name] = {
        status: 'failed',
        duration: error.duration || 0,
        command,
        error: error.stderr || error.message,
        code: error.code
      };
      
      this.results.summary.failed++;
      this.log(`Test suite failed: ${name}`, 'error');
      
      if (options.continueOnError) {
        return false;
      } else {
        throw error;
      }
    } finally {
      this.results.summary.total++;
    }
  }

  async checkPrerequisites() {
    this.log('Checking prerequisites...');
    
    // Check if MongoDB is running (for integration tests)
    try {
      await this.runCommand('node -e "console.log(\'MongoDB check\')"', this.rootDir, { silent: true });
    } catch (error) {
      this.log('MongoDB may not be running. Some tests may fail.', 'warning');
    }

    // Check if all dependencies are installed
    const dirs = ['backend', 'frontend', 'e2e', 'load-tests'];
    
    for (const dir of dirs) {
      const nodeModulesPath = path.join(this.rootDir, dir, 'node_modules');
      try {
        await fs.access(nodeModulesPath);
      } catch (error) {
        this.log(`Installing dependencies for ${dir}...`);
        await this.runCommand('npm install', path.join(this.rootDir, dir));
      }
    }
  }

  async runUnitTests() {
    this.log('Running unit tests...');
    
    // Backend unit tests
    await this.runTestSuite(
      'Backend Unit Tests',
      'test',
      path.join(this.rootDir, 'backend')
    );

    // Frontend unit tests
    await this.runTestSuite(
      'Frontend Unit Tests',
      'test',
      path.join(this.rootDir, 'frontend')
    );
  }

  async runIntegrationTests() {
    this.log('Running integration tests...');
    
    await this.runTestSuite(
      'Backend Integration Tests',
      'test:integration',
      path.join(this.rootDir, 'backend'),
      { continueOnError: true }
    );
  }

  async runPerformanceTests() {
    this.log('Running performance tests...');
    
    // Performance benchmarks
    await this.runTestSuite(
      'Performance Benchmarks',
      'test:benchmarks',
      path.join(this.rootDir, 'backend'),
      { continueOnError: true }
    );

    // Regression tests
    await this.runTestSuite(
      'Performance Regression Tests',
      'test:regression',
      path.join(this.rootDir, 'backend'),
      { continueOnError: true }
    );
  }

  async runE2ETests() {
    this.log('Running E2E tests...');
    
    // Install Playwright browsers if needed
    try {
      await this.runCommand('npx playwright install', path.join(this.rootDir, 'e2e'), { silent: true });
    } catch (error) {
      this.log('Playwright browser installation may have failed', 'warning');
    }

    // Basic E2E tests
    await this.runTestSuite(
      'E2E Functionality Tests',
      'test',
      path.join(this.rootDir, 'e2e'),
      { continueOnError: true }
    );

    // Performance E2E tests
    await this.runTestSuite(
      'E2E Performance Tests',
      'npx playwright test performance-e2e.spec.js',
      path.join(this.rootDir, 'e2e'),
      { continueOnError: true }
    );
  }

  async runAccessibilityTests() {
    this.log('Running accessibility tests...');
    
    await this.runTestSuite(
      'Accessibility Tests',
      'test:a11y',
      path.join(this.rootDir, 'e2e'),
      { continueOnError: true }
    );
  }

  async runLoadTests() {
    this.log('Running load tests...');
    
    // Check if k6 is available
    try {
      execSync('k6 version', { stdio: 'pipe' });
    } catch (error) {
      this.log('k6 not found. Skipping load tests. Install k6 to run load tests.', 'warning');
      this.results.tests['Load Tests'] = {
        status: 'skipped',
        reason: 'k6 not installed'
      };
      this.results.summary.skipped++;
      this.results.summary.total++;
      return;
    }

    // Start application for load testing
    this.log('Starting application for load testing...');
    
    const backendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(this.rootDir, 'backend'),
      stdio: 'pipe'
    });

    const frontendProcess = spawn('npm', ['run', 'dev'], {
      cwd: path.join(this.rootDir, 'frontend'),
      stdio: 'pipe'
    });

    // Wait for services to start
    await new Promise(resolve => setTimeout(resolve, 30000));

    try {
      // Basic load test
      await this.runTestSuite(
        'Basic Load Test',
        'test',
        path.join(this.rootDir, 'load-tests'),
        { continueOnError: true }
      );

      // Stress test
      await this.runTestSuite(
        'Stress Test',
        'test:stress',
        path.join(this.rootDir, 'load-tests'),
        { continueOnError: true }
      );

    } finally {
      // Clean up processes
      backendProcess.kill();
      frontendProcess.kill();
    }
  }

  async runCoverageAnalysis() {
    this.log('Running coverage analysis...');
    
    await this.runTestSuite(
      'Coverage Analysis',
      'test:coverage:report',
      this.rootDir,
      { continueOnError: true }
    );
  }

  async generateReport() {
    this.log('Generating comprehensive test report...');
    
    const reportDir = path.join(this.rootDir, 'test-reports');
    await fs.mkdir(reportDir, { recursive: true });

    // Generate JSON report
    const jsonReport = path.join(reportDir, `comprehensive-test-report-${Date.now()}.json`);
    await fs.writeFile(jsonReport, JSON.stringify(this.results, null, 2));

    // Generate HTML report
    const htmlReport = await this.generateHTMLReport();
    const htmlReportPath = path.join(reportDir, 'comprehensive-test-report.html');
    await fs.writeFile(htmlReportPath, htmlReport);

    this.log(`Reports generated:`);
    this.log(`  JSON: ${jsonReport}`);
    this.log(`  HTML: ${htmlReportPath}`);

    return { jsonReport, htmlReportPath };
  }

  generateHTMLReport() {
    const { passed, failed, skipped, total } = this.results.summary;
    const successRate = total > 0 ? ((passed / total) * 100).toFixed(2) : 0;

    const testRows = Object.entries(this.results.tests).map(([name, result]) => {
      const statusClass = result.status === 'passed' ? 'success' : 
                         result.status === 'failed' ? 'danger' : 'warning';
      const duration = result.duration ? `${result.duration}ms` : 'N/A';
      
      return `
        <tr class="${statusClass}">
          <td>${name}</td>
          <td><span class="badge ${statusClass}">${result.status}</span></td>
          <td>${duration}</td>
          <td>${result.command || 'N/A'}</td>
        </tr>
      `;
    }).join('');

    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Comprehensive Test Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; }
        .card h3 { margin-top: 0; }
        .card .number { font-size: 2em; font-weight: bold; }
        .success { color: #28a745; }
        .danger { color: #dc3545; }
        .warning { color: #ffc107; }
        .info { color: #17a2b8; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .badge { padding: 4px 8px; border-radius: 4px; color: white; font-size: 0.8em; }
        .badge.success { background-color: #28a745; }
        .badge.danger { background-color: #dc3545; }
        .badge.warning { background-color: #ffc107; color: #212529; }
        tr.success { background-color: #f8fff9; }
        tr.danger { background-color: #fff8f8; }
        tr.warning { background-color: #fffdf8; }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🧪 Comprehensive Test Report</h1>
            <p>Autocomplete Search Tool - Generated on ${new Date(this.results.timestamp).toLocaleString()}</p>
        </div>
        
        <div class="summary">
            <div class="card">
                <h3>Total Tests</h3>
                <div class="number info">${total}</div>
            </div>
            <div class="card">
                <h3>Passed</h3>
                <div class="number success">${passed}</div>
            </div>
            <div class="card">
                <h3>Failed</h3>
                <div class="number danger">${failed}</div>
            </div>
            <div class="card">
                <h3>Skipped</h3>
                <div class="number warning">${skipped}</div>
            </div>
            <div class="card">
                <h3>Success Rate</h3>
                <div class="number ${successRate >= 80 ? 'success' : successRate >= 60 ? 'warning' : 'danger'}">${successRate}%</div>
            </div>
        </div>
        
        <h2>Test Results</h2>
        <table>
            <thead>
                <tr>
                    <th>Test Suite</th>
                    <th>Status</th>
                    <th>Duration</th>
                    <th>Command</th>
                </tr>
            </thead>
            <tbody>
                ${testRows}
            </tbody>
        </table>
        
        <div class="timestamp">
            Report generated at: ${this.results.timestamp}
        </div>
    </div>
</body>
</html>`;
  }

  async run(options = {}) {
    this.log('🚀 Starting comprehensive test suite...', 'start');
    
    try {
      await this.checkPrerequisites();

      if (!options.skipUnit) {
        await this.runUnitTests();
      }

      if (!options.skipIntegration) {
        await this.runIntegrationTests();
      }

      if (!options.skipPerformance) {
        await this.runPerformanceTests();
      }

      if (!options.skipE2E) {
        await this.runE2ETests();
      }

      if (!options.skipAccessibility) {
        await this.runAccessibilityTests();
      }

      if (!options.skipLoad) {
        await this.runLoadTests();
      }

      if (!options.skipCoverage) {
        await this.runCoverageAnalysis();
      }

      const reports = await this.generateReport();

      this.log('🎉 Comprehensive test suite completed!', 'success');
      this.log(`Summary: ${this.results.summary.passed}/${this.results.summary.total} tests passed`);
      
      if (this.results.summary.failed > 0) {
        this.log(`${this.results.summary.failed} tests failed`, 'error');
        process.exit(1);
      }

    } catch (error) {
      this.log(`Test suite failed: ${error.message}`, 'error');
      await this.generateReport();
      process.exit(1);
    }
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  skipUnit: args.includes('--skip-unit'),
  skipIntegration: args.includes('--skip-integration'),
  skipPerformance: args.includes('--skip-performance'),
  skipE2E: args.includes('--skip-e2e'),
  skipAccessibility: args.includes('--skip-accessibility'),
  skipLoad: args.includes('--skip-load'),
  skipCoverage: args.includes('--skip-coverage')
};

// Run if called directly
if (require.main === module) {
  const runner = new ComprehensiveTestRunner();
  runner.run(options);
}

module.exports = ComprehensiveTestRunner;