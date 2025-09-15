#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const { execSync } = require('child_process');

class CoverageReporter {
  constructor() {
    this.rootDir = path.join(__dirname, '..');
    this.backendDir = path.join(this.rootDir, 'backend');
    this.frontendDir = path.join(this.rootDir, 'frontend');
    this.reportsDir = path.join(this.rootDir, 'coverage-reports');
  }

  async ensureReportsDirectory() {
    try {
      await fs.mkdir(this.reportsDir, { recursive: true });
    } catch (error) {
      console.error('Failed to create reports directory:', error);
    }
  }

  async runBackendCoverage() {
    console.log('🔍 Running backend coverage tests...');
    
    try {
      const output = execSync('npm run test:coverage', {
        cwd: this.backendDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Backend coverage completed');
      return true;
    } catch (error) {
      console.error('❌ Backend coverage failed:', error.message);
      return false;
    }
  }

  async runFrontendCoverage() {
    console.log('🔍 Running frontend coverage tests...');
    
    try {
      const output = execSync('npm run test:coverage', {
        cwd: this.frontendDir,
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      console.log('✅ Frontend coverage completed');
      return true;
    } catch (error) {
      console.error('❌ Frontend coverage failed:', error.message);
      return false;
    }
  }

  async parseCoverageData(coverageFile) {
    try {
      const data = await fs.readFile(coverageFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      console.warn(`Could not parse coverage file ${coverageFile}:`, error.message);
      return null;
    }
  }

  async generateCombinedReport() {
    console.log('📊 Generating combined coverage report...');
    
    const backendCoverageFile = path.join(this.backendDir, 'coverage', 'coverage-final.json');
    const frontendCoverageFile = path.join(this.frontendDir, 'coverage', 'coverage-final.json');
    
    const backendCoverage = await this.parseCoverageData(backendCoverageFile);
    const frontendCoverage = await this.parseCoverageData(frontendCoverageFile);
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        backend: this.extractSummary(backendCoverage),
        frontend: this.extractSummary(frontendCoverage)
      },
      details: {
        backend: backendCoverage,
        frontend: frontendCoverage
      }
    };
    
    // Calculate overall coverage
    if (report.summary.backend && report.summary.frontend) {
      report.summary.overall = this.calculateOverallCoverage(
        report.summary.backend,
        report.summary.frontend
      );
    }
    
    const reportFile = path.join(this.reportsDir, `coverage-report-${Date.now()}.json`);
    await fs.writeFile(reportFile, JSON.stringify(report, null, 2));
    
    console.log(`📄 Combined report saved to: ${reportFile}`);
    
    return report;
  }

  extractSummary(coverageData) {
    if (!coverageData) return null;
    
    let totalLines = 0;
    let coveredLines = 0;
    let totalFunctions = 0;
    let coveredFunctions = 0;
    let totalBranches = 0;
    let coveredBranches = 0;
    let totalStatements = 0;
    let coveredStatements = 0;
    
    Object.values(coverageData).forEach(file => {
      if (file.s) {
        totalStatements += Object.keys(file.s).length;
        coveredStatements += Object.values(file.s).filter(count => count > 0).length;
      }
      
      if (file.f) {
        totalFunctions += Object.keys(file.f).length;
        coveredFunctions += Object.values(file.f).filter(count => count > 0).length;
      }
      
      if (file.b) {
        Object.values(file.b).forEach(branch => {
          totalBranches += branch.length;
          coveredBranches += branch.filter(count => count > 0).length;
        });
      }
    });
    
    return {
      statements: {
        total: totalStatements,
        covered: coveredStatements,
        percentage: totalStatements > 0 ? (coveredStatements / totalStatements) * 100 : 0
      },
      functions: {
        total: totalFunctions,
        covered: coveredFunctions,
        percentage: totalFunctions > 0 ? (coveredFunctions / totalFunctions) * 100 : 0
      },
      branches: {
        total: totalBranches,
        covered: coveredBranches,
        percentage: totalBranches > 0 ? (coveredBranches / totalBranches) * 100 : 0
      }
    };
  }

  calculateOverallCoverage(backendSummary, frontendSummary) {
    const overall = {
      statements: {
        total: backendSummary.statements.total + frontendSummary.statements.total,
        covered: backendSummary.statements.covered + frontendSummary.statements.covered
      },
      functions: {
        total: backendSummary.functions.total + frontendSummary.functions.total,
        covered: backendSummary.functions.covered + frontendSummary.functions.covered
      },
      branches: {
        total: backendSummary.branches.total + frontendSummary.branches.total,
        covered: backendSummary.branches.covered + frontendSummary.branches.covered
      }
    };
    
    // Calculate percentages
    overall.statements.percentage = overall.statements.total > 0 ? 
      (overall.statements.covered / overall.statements.total) * 100 : 0;
    overall.functions.percentage = overall.functions.total > 0 ? 
      (overall.functions.covered / overall.functions.total) * 100 : 0;
    overall.branches.percentage = overall.branches.total > 0 ? 
      (overall.branches.covered / overall.branches.total) * 100 : 0;
    
    return overall;
  }

  async generateHTMLReport(report) {
    console.log('🌐 Generating HTML coverage report...');
    
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Coverage Report - Autocomplete Search Tool</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background-color: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .card { background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #007bff; }
        .card h3 { margin-top: 0; color: #333; }
        .metric { display: flex; justify-content: space-between; margin: 10px 0; }
        .percentage { font-weight: bold; }
        .good { color: #28a745; }
        .warning { color: #ffc107; }
        .danger { color: #dc3545; }
        .progress-bar { width: 100%; height: 20px; background: #e9ecef; border-radius: 10px; overflow: hidden; margin: 5px 0; }
        .progress-fill { height: 100%; transition: width 0.3s ease; }
        .timestamp { text-align: center; color: #666; margin-top: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background-color: #f8f9fa; font-weight: bold; }
        .overall { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Code Coverage Report</h1>
            <p>Autocomplete Search Tool - Generated on ${new Date(report.timestamp).toLocaleString()}</p>
        </div>
        
        ${this.generateSummaryHTML(report.summary)}
        
        <div class="timestamp">
            Report generated at: ${report.timestamp}
        </div>
    </div>
</body>
</html>`;
    
    const htmlFile = path.join(this.reportsDir, 'coverage-report.html');
    await fs.writeFile(htmlFile, html);
    
    console.log(`🌐 HTML report saved to: ${htmlFile}`);
    return htmlFile;
  }

  generateSummaryHTML(summary) {
    if (!summary) return '<p>No coverage data available</p>';
    
    const sections = [];
    
    if (summary.overall) {
      sections.push(this.generateCardHTML('Overall Coverage', summary.overall, 'overall'));
    }
    
    if (summary.backend) {
      sections.push(this.generateCardHTML('Backend Coverage', summary.backend, 'backend'));
    }
    
    if (summary.frontend) {
      sections.push(this.generateCardHTML('Frontend Coverage', summary.frontend, 'frontend'));
    }
    
    return `<div class="summary">${sections.join('')}</div>`;
  }

  generateCardHTML(title, data, type) {
    const cardClass = type === 'overall' ? 'card overall' : 'card';
    
    return `
      <div class="${cardClass}">
        <h3>${title}</h3>
        ${this.generateMetricHTML('Statements', data.statements)}
        ${this.generateMetricHTML('Functions', data.functions)}
        ${this.generateMetricHTML('Branches', data.branches)}
      </div>
    `;
  }

  generateMetricHTML(name, metric) {
    const percentage = metric.percentage.toFixed(2);
    const colorClass = percentage >= 80 ? 'good' : percentage >= 60 ? 'warning' : 'danger';
    
    return `
      <div class="metric">
        <span>${name}:</span>
        <span class="percentage ${colorClass}">${percentage}% (${metric.covered}/${metric.total})</span>
      </div>
      <div class="progress-bar">
        <div class="progress-fill ${colorClass}" style="width: ${percentage}%; background-color: ${this.getColorForPercentage(percentage)};"></div>
      </div>
    `;
  }

  getColorForPercentage(percentage) {
    if (percentage >= 80) return '#28a745';
    if (percentage >= 60) return '#ffc107';
    return '#dc3545';
  }

  async checkCoverageThresholds(report) {
    console.log('🎯 Checking coverage thresholds...');
    
    const thresholds = {
      statements: 80,
      functions: 80,
      branches: 80
    };
    
    const failures = [];
    
    if (report.summary.overall) {
      const overall = report.summary.overall;
      
      Object.keys(thresholds).forEach(metric => {
        const threshold = thresholds[metric];
        const actual = overall[metric].percentage;
        
        if (actual < threshold) {
          failures.push(`${metric}: ${actual.toFixed(2)}% < ${threshold}%`);
        }
      });
    }
    
    if (failures.length > 0) {
      console.error('❌ Coverage thresholds not met:');
      failures.forEach(failure => console.error(`  - ${failure}`));
      return false;
    } else {
      console.log('✅ All coverage thresholds met');
      return true;
    }
  }

  async run() {
    console.log('🚀 Starting comprehensive coverage analysis...');
    
    await this.ensureReportsDirectory();
    
    const backendSuccess = await this.runBackendCoverage();
    const frontendSuccess = await this.runFrontendCoverage();
    
    if (!backendSuccess && !frontendSuccess) {
      console.error('❌ Both backend and frontend coverage failed');
      process.exit(1);
    }
    
    const report = await this.generateCombinedReport();
    await this.generateHTMLReport(report);
    
    const thresholdsMet = await this.checkCoverageThresholds(report);
    
    console.log('\n📈 Coverage Summary:');
    if (report.summary.overall) {
      const overall = report.summary.overall;
      console.log(`  Statements: ${overall.statements.percentage.toFixed(2)}%`);
      console.log(`  Functions:  ${overall.functions.percentage.toFixed(2)}%`);
      console.log(`  Branches:   ${overall.branches.percentage.toFixed(2)}%`);
    }
    
    if (!thresholdsMet) {
      process.exit(1);
    }
    
    console.log('🎉 Coverage analysis completed successfully!');
  }
}

// Run if called directly
if (require.main === module) {
  const reporter = new CoverageReporter();
  reporter.run().catch(error => {
    console.error('Coverage analysis failed:', error);
    process.exit(1);
  });
}

module.exports = CoverageReporter;