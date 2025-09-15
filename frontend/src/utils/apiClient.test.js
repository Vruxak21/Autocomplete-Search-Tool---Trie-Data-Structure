import { vi, beforeEach } from 'vitest';

// Mock axios before importing apiClient
const mockAxiosInstance = {
  get: vi.fn(),
  post: vi.fn(),
  interceptors: {
    request: { use: vi.fn() },
    response: { use: vi.fn() },
  },
};

vi.mock('axios', () => ({
  default: {
    create: vi.fn(() => mockAxiosInstance),
  },
}));

// Import after mocking
const { api, isRetryableError, getErrorMessage } = await import('./apiClient');

describe('apiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    console.warn = vi.fn();
    console.log = vi.fn();
  });

  describe('api.search', () => {
    it('makes successful search request', async () => {
      const mockResponse = {
        suggestions: [
          { word: 'test', frequency: 5 },
          { word: 'testing', frequency: 3 },
        ],
      };

      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await api.search('test');

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/search', {
        params: { query: 'test' },
      });
      expect(result).toEqual(mockResponse);
    });

    it('handles search request with options', async () => {
      const mockResponse = { suggestions: [] };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      await api.search('test', { limit: 10, typoTolerance: true });

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/search', {
        params: { query: 'test', limit: 10, typoTolerance: true },
      });
    });

    it('handles search request error', async () => {
      const mockError = new Error('Network error');
      mockError.code = 'NETWORK_ERROR';
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Network error');
    });
  });

  describe('api.getTrieStructure', () => {
    it('makes successful trie structure request', async () => {
      const mockResponse = { structure: { nodes: [], edges: [] } };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await api.getTrieStructure();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/trie/structure');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.incrementFrequency', () => {
    it('makes successful frequency increment request', async () => {
      const mockResponse = { success: true };
      mockAxiosInstance.post.mockResolvedValue({ data: mockResponse });

      const result = await api.incrementFrequency('test');

      expect(mockAxiosInstance.post).toHaveBeenCalledWith('/api/frequency/increment', { word: 'test' });
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.getPerformanceMetrics', () => {
    it('makes successful performance metrics request', async () => {
      const mockResponse = { requests: {}, memory: {}, trie: {} };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await api.getPerformanceMetrics();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/performance/metrics');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('api.healthCheck', () => {
    it('makes successful health check request', async () => {
      const mockResponse = { status: 'healthy' };
      mockAxiosInstance.get.mockResolvedValue({ data: mockResponse });

      const result = await api.healthCheck();

      expect(mockAxiosInstance.get).toHaveBeenCalledWith('/api/health');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('error handling', () => {
    it('handles 400 Bad Request', async () => {
      const mockError = {
        response: {
          status: 400,
          data: { message: 'Invalid query parameter' },
        },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Invalid query parameter');
    });

    it('handles 401 Unauthorized', async () => {
      const mockError = {
        response: { status: 401 },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Authentication required. Please log in.');
    });

    it('handles 404 Not Found', async () => {
      const mockError = {
        response: { status: 404 },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('The requested resource was not found.');
    });

    it('handles 500 Internal Server Error', async () => {
      const mockError = {
        response: { status: 500 },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Server error. Please try again later.');
    });

    it('handles timeout error', async () => {
      const mockError = new Error('Timeout');
      mockError.code = 'ECONNABORTED';
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Timeout');
    });

    it('handles network error', async () => {
      const mockError = {
        request: {},
        message: 'Network Error',
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      await expect(api.search('test')).rejects.toThrow('Network error. Please check your internet connection.');
    });

    it('sets isRetryable flag correctly', async () => {
      const mockError = {
        response: { status: 500 },
      };
      mockAxiosInstance.get.mockRejectedValue(mockError);

      try {
        await api.search('test');
      } catch (error) {
        expect(error.isRetryable).toBe(true);
      }
    });
  });

  describe('utility functions', () => {
    it('isRetryableError returns correct value', () => {
      const retryableError = { isRetryable: true };
      const nonRetryableError = { isRetryable: false };
      const errorWithoutFlag = {};

      expect(isRetryableError(retryableError)).toBe(true);
      expect(isRetryableError(nonRetryableError)).toBe(false);
      expect(isRetryableError(errorWithoutFlag)).toBe(false);
    });

    it('getErrorMessage returns correct message', () => {
      const errorWithMessage = { message: 'Custom error message' };
      const errorWithoutMessage = {};

      expect(getErrorMessage(errorWithMessage)).toBe('Custom error message');
      expect(getErrorMessage(errorWithoutMessage)).toBe('An unexpected error occurred');
    });
  });
});