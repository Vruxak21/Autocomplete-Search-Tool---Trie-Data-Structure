/**
 * @fileoverview Mock implementation of apiClient for testing
 */

import { vi } from 'vitest';

// Mock axios instance
const mockAxiosInstance = {
  get: vi.fn(() => Promise.resolve({ data: {} })),
  post: vi.fn(() => Promise.resolve({ data: {} })),
  put: vi.fn(() => Promise.resolve({ data: {} })),
  delete: vi.fn(() => Promise.resolve({ data: {} })),
  interceptors: {
    request: {
      use: vi.fn(),
      eject: vi.fn(),
    },
    response: {
      use: vi.fn(),
      eject: vi.fn(),
    },
  },
  defaults: {
    headers: {
      common: {},
    },
  },
};

// Mock API methods
export const api = {
  search: vi.fn(() => Promise.resolve({ suggestions: [] })),
  getTrieStructure: vi.fn(() => Promise.resolve({ nodes: [] })),
  incrementFrequency: vi.fn(() => Promise.resolve({ success: true })),
  getPerformanceMetrics: vi.fn(() => Promise.resolve({ metrics: {} })),
  healthCheck: vi.fn(() => Promise.resolve({ status: 'ok' })),
};

// Mock utility functions
export const isRetryableError = vi.fn(() => false);
export const getErrorMessage = vi.fn((error) => error.message || 'Mock error');

// Export the mock axios instance as default
export default mockAxiosInstance;