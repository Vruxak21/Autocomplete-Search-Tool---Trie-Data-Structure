# Testing Documentation

This document provides comprehensive information about the testing infrastructure for the Autocomplete Search Tool.

## Overview

The project implements a multi-layered testing strategy that includes:

- **Unit Tests** - Testing individual components and functions
- **Integration Tests** - Testing component interactions
- **End-to-End Tests** - Testing complete user workflows
- **Performance Tests** - Load testing and benchmarking
- **Accessibility Tests** - WCAG compliance testing
- **Regression Tests** - Performance regression detection
- **Code Coverage** - Comprehensive coverage reporting

## Test Structure

```
autocomplete-search-tool/
├── backend/tests/
│   ├── benchmarks/           # Performance benchmarks
│   ├── data-structures/      # Trie and Heap tests
│   ├── integration/          # API integration tests
│   ├── regression/           # Performance regression tests
│   ├── services/             # Service layer tests
│   └── scripts/              # Test utilities
├── frontend/src/
│   ├── components/__tests__/ # Component unit tests
│   ├── hooks/               # Hook tests
│   ├── pages/               # Page component tests
│   └── utils/               # Utility function tests
├── e2e/tests/               # End-to-end tests
│   ├── accessibility.spec.js
│   ├── performance-e2e.spec.js
│   ├── search-functionality.spec.js
│   └── visualization.spec.js
└── load-tests/              # Load and stress tests
    ├── search-load-test.js
    ├── stress-test.js
    └── spike-test.js
```

## Running Tests

### All Tests
```bash
npm run test:all          # Run all test suites
npm run test:ci           # Run all tests with coverage report
```

### Unit Tests
```bash
# Backend unit tests
cd backend && npm test
cd backend && npm run test:watch    # Watch mode
cd backend && npm run test:coverage # With coverage

# Frontend unit tests
cd frontend && npm test
cd frontend && npm run test:watch   # Watch mode
cd frontend && npm run test:coverage # With coverage
```

### Integration Tests
```bash
cd backend && npm run test:integration
```

### End-to-End Tests
```bash
npm run test:e2e                    # All E2E tests
npm run test:e2e:headed            # With browser UI
npm run test:e2e:performance       # Performance E2E tests
npm run test:accessibility         # Accessibility tests
```

### Performance Tests
```bash
npm run test:benchmarks             # Performance benchmarks
npm run test:regression             # Regression tests
npm run test:load                   # Basic load tests
npm run test:load:stress           # Stress tests
npm run test:load:spike            # Spike tests
```

### Coverage Reports
```bash
npm run test:coverage              # Generate coverage for both frontend and backend
npm run test:coverage:report       # Generate comprehensive HTML report
```

## Test Configuration

### Backend (Jest)
- **Configuration**: `backend/jest.config.js`
- **Coverage Threshold**: 80% for statements, functions, branches, and lines
- **Test Environment**: Node.js
- **Setup**: `backend/tests/setup.js`

### Frontend (Vitest)
- **Configuration**: `frontend/vite.config.js`
- **Coverage Threshold**: 80% for statements, functions, branches, and lines
- **Test Environment**: jsdom
- **Setup**: `frontend/src/test/setup.js`

### E2E (Playwright)
- **Configuration**: `e2e/playwright.config.js`
- **Browsers**: Chrome, Firefox, Safari, Mobile Chrome, Mobile Safari
- **Base URL**: `http://localhost:3000`
- **Parallel Execution**: Enabled

### Load Testing (k6)
- **Tool**: k6 performance testing tool
- **Scenarios**: Load, Stress, and Spike testing
- **Thresholds**: Response time and error rate limits

## Performance Benchmarks

### Backend Performance Targets
- **Trie Insertion**: 1000 words in < 50ms
- **Search Operations**: < 5ms per search
- **Concurrent Searches**: 100 searches in < 100ms total
- **Memory Usage**: < 100MB for 50k items
- **API Response**: < 50ms for typical queries

### Frontend Performance Targets
- **Initial Load**: < 3 seconds
- **Search Response**: < 500ms
- **Typing Response**: < 200ms per keystroke
- **Visualization Load**: < 5 seconds
- **Core Web Vitals**:
  - LCP (Largest Contentful Paint): < 2.5s
  - CLS (Cumulative Layout Shift): < 0.1

### Load Testing Scenarios

#### Basic Load Test
- **Users**: 10-20 concurrent users
- **Duration**: 16 minutes
- **Threshold**: 95% requests < 100ms, error rate < 10%

#### Stress Test
- **Users**: Up to 300 concurrent users
- **Duration**: 16 minutes
- **Threshold**: 95% requests < 200ms, error rate < 5%

#### Spike Test
- **Users**: Sudden spikes to 500-1000 users
- **Duration**: Variable spikes with recovery periods
- **Threshold**: System recovery and error handling

## Accessibility Testing

### WCAG Compliance
- **Level**: AA compliance
- **Tools**: axe-core, Playwright accessibility testing
- **Coverage**:
  - Keyboard navigation
  - Screen reader compatibility
  - Color contrast
  - ARIA labels and roles
  - Focus management
  - High contrast mode support
  - Reduced motion preferences

### Accessibility Test Scenarios
- Automated accessibility scanning
- Keyboard-only navigation
- Screen reader announcements
- High contrast mode testing
- RTL language support
- Voice control compatibility
- Screen magnification support

## Regression Testing

### Performance Regression Detection
- **Baseline Storage**: `backend/tests/regression/performance-baseline.json`
- **Threshold**: 20% performance degradation triggers failure
- **Metrics Tracked**:
  - Trie insertion performance
  - Search operation speed
  - Memory usage patterns
  - Concurrent operation handling

### Regression Test Process
1. Run performance benchmarks
2. Compare against stored baseline
3. Update baseline if performance improves significantly
4. Fail if performance degrades beyond threshold
5. Generate performance reports

## Coverage Reporting

### Coverage Targets
- **Statements**: 80%
- **Functions**: 80%
- **Branches**: 80%
- **Lines**: 80%

### Coverage Reports
- **JSON**: Machine-readable coverage data
- **HTML**: Interactive coverage browser
- **LCOV**: For CI/CD integration
- **Combined**: Unified frontend + backend report

### Coverage Exclusions
- Configuration files
- Test files themselves
- Build artifacts
- Third-party dependencies

## CI/CD Integration

### GitHub Actions Workflow
The CI/CD pipeline includes:

1. **Unit Tests**: Backend and frontend unit tests with coverage
2. **Performance Benchmarks**: Automated performance testing
3. **E2E Tests**: Cross-browser end-to-end testing
4. **Accessibility Tests**: WCAG compliance verification
5. **Load Tests**: Performance under load (main branch only)
6. **Coverage Reporting**: Comprehensive coverage analysis
7. **Quality Gates**: All tests must pass before deployment

### Workflow Triggers
- **Pull Requests**: Unit tests, E2E tests, accessibility tests
- **Main Branch**: All tests including load testing
- **Scheduled**: Nightly regression testing (if configured)

## Test Data Management

### Test Datasets
- **Sample Data**: Small dataset for fast testing
- **Cities Dataset**: Real-world city names
- **Products Dataset**: E-commerce product names
- **Mixed Dataset**: Combination of different data types

### Data Seeding
```bash
cd backend && npm run seed:sample    # Small test dataset
cd backend && npm run seed:cities    # City names only
cd backend && npm run seed:products  # Product names only
cd backend && npm run seed:mixed     # Mixed dataset
```

## Debugging Tests

### Backend Tests
```bash
cd backend && npm run test:watch     # Watch mode for development
cd backend && npm test -- --verbose # Detailed output
```

### Frontend Tests
```bash
cd frontend && npm run test:watch    # Watch mode
cd frontend && npm test -- --reporter=verbose # Detailed output
```

### E2E Tests
```bash
cd e2e && npm run test:debug         # Debug mode
cd e2e && npm run test:ui           # Interactive UI mode
```

### Load Tests
```bash
cd load-tests && k6 run --http-debug search-load-test.js  # Debug HTTP requests
```

## Performance Monitoring

### Metrics Collection
- Response times (p50, p95, p99)
- Error rates
- Throughput (requests per second)
- Memory usage
- CPU utilization
- Database performance

### Alerting Thresholds
- Response time > 1 second
- Error rate > 5%
- Memory usage > 500MB
- CPU usage > 80%

## Best Practices

### Writing Tests
1. **Descriptive Names**: Use clear, descriptive test names
2. **Arrange-Act-Assert**: Follow the AAA pattern
3. **Independent Tests**: Each test should be independent
4. **Mock External Dependencies**: Use mocks for external services
5. **Test Edge Cases**: Include boundary conditions and error cases

### Performance Testing
1. **Realistic Data**: Use production-like datasets
2. **Gradual Load**: Ramp up load gradually
3. **Monitor Resources**: Track CPU, memory, and network
4. **Baseline Comparison**: Compare against previous runs
5. **Environment Consistency**: Use consistent test environments

### Accessibility Testing
1. **Automated + Manual**: Combine automated tools with manual testing
2. **Real Users**: Include users with disabilities in testing
3. **Multiple Tools**: Use various accessibility testing tools
4. **Keyboard Testing**: Test all functionality with keyboard only
5. **Screen Reader Testing**: Test with actual screen readers

## Troubleshooting

### Common Issues

#### Test Timeouts
- Increase timeout values in test configuration
- Check for async operations that aren't properly awaited
- Verify test environment performance

#### Flaky Tests
- Add proper wait conditions
- Use deterministic test data
- Avoid time-based assertions
- Check for race conditions

#### Coverage Issues
- Verify test file patterns in configuration
- Check for excluded files
- Ensure all code paths are tested
- Review coverage thresholds

#### Performance Test Failures
- Check system resources during test execution
- Verify baseline data is current
- Review performance thresholds
- Check for external factors affecting performance

### Getting Help
- Check test logs for detailed error messages
- Review CI/CD pipeline outputs
- Consult team documentation
- Use debugging tools and verbose output modes

## Maintenance

### Regular Tasks
- Update test dependencies monthly
- Review and update performance baselines quarterly
- Audit accessibility compliance semi-annually
- Update test data as application evolves
- Review and adjust coverage thresholds as needed

### Monitoring
- Track test execution times
- Monitor test failure rates
- Review coverage trends
- Analyze performance regression patterns
- Update documentation as tests evolve