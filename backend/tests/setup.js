// Jest setup file for backend tests
// Add any global test setup here

// Set NODE_ENV to test before loading any modules
process.env.NODE_ENV = 'test';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Mock console methods in tests to reduce noise
global.console = {
  ...console,
  // Uncomment to suppress console.log in tests
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Global test cleanup
afterAll(async () => {
  // Clean up any open handles
  await new Promise(resolve => setTimeout(resolve, 100));
});