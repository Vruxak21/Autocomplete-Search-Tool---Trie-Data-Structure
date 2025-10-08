import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    include: [
      'src/test/integration/**/*.test.{js,jsx}',
      'src/test/performance/**/*.test.{js,jsx}'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: [
        'src/components/**/*.{js,jsx}',
        'src/utils/**/*.{js,jsx}',
        'src/hooks/**/*.{js,jsx}'
      ],
      exclude: [
        'src/test/**',
        '**/*.test.{js,jsx}',
        '**/*.spec.{js,jsx}'
      ],
      thresholds: {
        global: {
          branches: 75,
          functions: 75,
          lines: 75,
          statements: 75
        }
      }
    },
    testTimeout: 30000, // Longer timeout for integration tests
    hookTimeout: 10000,
    teardownTimeout: 5000,
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: false,
        maxThreads: 4,
        minThreads: 1
      }
    },
    logHeapUsage: true,
    reporter: ['verbose', 'json'],
    outputFile: {
      json: './test-results/integration-results.json'
    }
  },
  define: {
    __DEV__: true,
    'process.env.NODE_ENV': JSON.stringify('test'),
  },
});