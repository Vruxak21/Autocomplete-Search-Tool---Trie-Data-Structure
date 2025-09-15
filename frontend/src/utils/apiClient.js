import axios from 'axios';

// Default configuration
const DEFAULT_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3002',
  timeout: 10000,
  retries: 3,
  retryDelay: 1000,
};

// Create axios instance
const apiClient = axios.create({
  baseURL: DEFAULT_CONFIG.baseURL,
  timeout: DEFAULT_CONFIG.timeout,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry configuration
const retryConfig = {
  retries: DEFAULT_CONFIG.retries,
  retryDelay: DEFAULT_CONFIG.retryDelay,
  retryCondition: (error) => {
    // Retry on network errors or 5xx status codes
    return (
      !error.response ||
      error.code === 'NETWORK_ERROR' ||
      error.code === 'ECONNABORTED' ||
      (error.response.status >= 500 && error.response.status < 600)
    );
  },
};

// Exponential backoff delay calculation
const calculateRetryDelay = (retryNumber, baseDelay = 1000) => {
  return Math.min(baseDelay * Math.pow(2, retryNumber), 10000);
};

// Retry interceptor
const retryInterceptor = async (error) => {
  const config = error.config;
  
  // Initialize retry count if not present
  if (!config.__retryCount) {
    config.__retryCount = 0;
  }

  // Check if we should retry
  if (
    config.__retryCount >= retryConfig.retries ||
    !retryConfig.retryCondition(error)
  ) {
    return Promise.reject(error);
  }

  // Increment retry count
  config.__retryCount += 1;

  // Calculate delay
  const delay = calculateRetryDelay(config.__retryCount - 1, retryConfig.retryDelay);

  // Log retry attempt
  console.warn(`API request failed, retrying in ${delay}ms (attempt ${config.__retryCount}/${retryConfig.retries})`);

  // Wait before retrying
  await new Promise(resolve => setTimeout(resolve, delay));

  // Retry the request
  return apiClient(config);
};

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    config.metadata = { startTime: new Date() };
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    // Calculate response time
    const endTime = new Date();
    const duration = endTime - response.config.metadata.startTime;
    response.duration = duration;
    
    // Log successful requests in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`API Success: ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`);
    }
    
    return response;
  },
  retryInterceptor
);

// Enhanced error handling
const handleApiError = (error) => {
  let errorMessage = 'An unexpected error occurred';
  let errorCode = 'UNKNOWN_ERROR';
  let statusCode = null;

  if (error.response) {
    // Server responded with error status
    statusCode = error.response.status;
    errorCode = error.response.data?.code || `HTTP_${statusCode}`;
    
    switch (statusCode) {
      case 400:
        errorMessage = error.response.data?.message || 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Authentication required. Please log in.';
        break;
      case 403:
        errorMessage = 'Access denied. You don\'t have permission to perform this action.';
        break;
      case 404:
        errorMessage = 'The requested resource was not found.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please wait a moment and try again.';
        break;
      case 500:
        errorMessage = 'Server error. Please try again later.';
        break;
      case 502:
      case 503:
      case 504:
        errorMessage = 'Service temporarily unavailable. Please try again later.';
        break;
      default:
        errorMessage = error.response.data?.message || `Server error (${statusCode})`;
    }
  } else if (error.request) {
    // Network error
    if (error.code === 'ECONNABORTED') {
      errorMessage = 'Request timeout. Please check your connection and try again.';
      errorCode = 'TIMEOUT';
    } else {
      errorMessage = 'Network error. Please check your internet connection.';
      errorCode = 'NETWORK_ERROR';
    }
  } else {
    // Request setup error
    errorMessage = error.message || 'Failed to send request';
    errorCode = 'REQUEST_ERROR';
  }

  const enhancedError = new Error(errorMessage);
  enhancedError.code = errorCode;
  enhancedError.statusCode = statusCode;
  enhancedError.originalError = error;
  enhancedError.isRetryable = retryConfig.retryCondition(error);

  return enhancedError;
};

// API methods with enhanced error handling
export const api = {
  // Search suggestions
  search: async (query, options = {}) => {
    try {
      const response = await apiClient.get('/api/search', {
        params: { query, ...options },
      });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get Trie structure for visualization
  getTrieStructure: async () => {
    try {
      const response = await apiClient.get('/api/trie/structure');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Increment frequency for selected suggestion
  incrementFrequency: async (word) => {
    try {
      const response = await apiClient.post('/api/frequency/increment', { word });
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Get performance metrics
  getPerformanceMetrics: async () => {
    try {
      const response = await apiClient.get('/api/performance/metrics');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },

  // Health check
  healthCheck: async () => {
    try {
      const response = await apiClient.get('/api/health');
      return response.data;
    } catch (error) {
      throw handleApiError(error);
    }
  },
};

// Utility function to check if error is retryable
export const isRetryableError = (error) => {
  return error.isRetryable || false;
};

// Utility function to get user-friendly error message
export const getErrorMessage = (error) => {
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

// Export the configured axios instance for direct use if needed
export default apiClient;