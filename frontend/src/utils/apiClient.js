import axios from 'axios';

// Default configuration
const DEFAULT_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001',
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
      // Fallback to mock data for testing
      console.warn('Backend not available, using mock data for testing');
      
      // Create comprehensive mock data that will form a good tree structure
      const allMockData = [
        // "app" prefix group
        { word: 'apple', frequency: 150, type: 'exact_match' },
        { word: 'application', frequency: 120, type: 'exact_match' },
        { word: 'apply', frequency: 90, type: 'exact_match' },
        { word: 'approach', frequency: 80, type: 'exact_match' },
        { word: 'appreciate', frequency: 70, type: 'exact_match' },
        { word: 'appropriate', frequency: 60, type: 'exact_match' },
        { word: 'approval', frequency: 50, type: 'exact_match' },
        { word: 'approximate', frequency: 40, type: 'exact_match' },
        
        // "new" prefix group
        { word: 'new york', frequency: 200, type: 'exact_match' },
        { word: 'new delhi', frequency: 180, type: 'exact_match' },
        { word: 'new zealand', frequency: 160, type: 'exact_match' },
        { word: 'new jersey', frequency: 140, type: 'exact_match' },
        { word: 'new mexico', frequency: 120, type: 'exact_match' },
        { word: 'new orleans', frequency: 100, type: 'exact_match' },
        
        // "san" prefix group
        { word: 'san francisco', frequency: 250, type: 'exact_match' },
        { word: 'san diego', frequency: 220, type: 'exact_match' },
        { word: 'san antonio', frequency: 200, type: 'exact_match' },
        { word: 'san jose', frequency: 180, type: 'exact_match' },
        { word: 'santa monica', frequency: 160, type: 'exact_match' },
        { word: 'santa barbara', frequency: 140, type: 'exact_match' },
        
        // "to" prefix group
        { word: 'tokyo', frequency: 300, type: 'exact_match' },
        { word: 'toronto', frequency: 280, type: 'exact_match' },
        { word: 'today', frequency: 260, type: 'exact_match' },
        { word: 'tomorrow', frequency: 240, type: 'exact_match' },
        { word: 'together', frequency: 220, type: 'exact_match' },
        { word: 'total', frequency: 200, type: 'exact_match' },
        
        // Single letters for testing
        { word: 'amazing', frequency: 100, type: 'exact_match' },
        { word: 'beautiful', frequency: 90, type: 'exact_match' },
        { word: 'creative', frequency: 80, type: 'exact_match' },
        { word: 'delicious', frequency: 70, type: 'exact_match' },
        { word: 'excellent', frequency: 60, type: 'exact_match' },
      ];
      
      const filteredSuggestions = allMockData.filter(item => 
        item.word.toLowerCase().includes(query.toLowerCase())
      );
      
      return {
        suggestions: filteredSuggestions.slice(0, 15), // Limit to 15 for better tree structure
        query: query,
        totalMatches: filteredSuggestions.length,
        processingTime: 15
      };
    }
  },

  // Get Trie structure for visualization
  getTrieStructure: async (options = {}) => {
    try {
      const response = await apiClient.get('/api/trie/structure', {
        params: options
      });
      
      // Check if backend returned valid data
      const data = response.data;
      if (!data.structure || !data.structure.nodes || data.structure.nodes.length <= 1 || !data.structure.edges || data.structure.edges.length === 0) {
        console.warn('Backend returned incomplete trie data, falling back to mock data');
        throw new Error('Incomplete backend data');
      }
      
      return data;
    } catch (error) {
      // Fallback to mock data for testing
      console.warn('Backend not available, using mock trie data for testing');
      
      const { depth = 3, maxNodes = 100, prefix = '' } = options;
      
      // Create a proper mock trie structure
      const mockNodes = [
        { id: 0, character: 'ROOT', prefix: '', isEndOfWord: false, frequency: 0, depth: 0, childCount: 0 }
      ];
      
      const mockEdges = [];
      let nodeId = 1;
      
      // Create a comprehensive sample trie
      const sampleWords = [
        'app', 'apple', 'apply', 'application', 'approach', 'appropriate',
        'cat', 'car', 'card', 'care', 'careful', 'carry',
        'new', 'news', 'next', 'never', 'network', 'need',
        'test', 'testing', 'text', 'team', 'teach', 'teacher'
      ];
      
      const filteredWords = prefix ? 
        sampleWords.filter(w => w.toLowerCase().startsWith(prefix.toLowerCase())) : 
        sampleWords.slice(0, Math.min(15, maxNodes / 3));
      
      // Build proper trie structure
      const nodeMap = new Map(); // prefix -> node
      nodeMap.set('', mockNodes[0]);
      
      filteredWords.forEach(word => {
        if (nodeId > maxNodes) return;
        
        for (let i = 1; i <= Math.min(word.length, depth + 1); i++) {
          const currentPrefix = word.substring(0, i);
          const parentPrefix = word.substring(0, i - 1);
          const char = word[i - 1];
          const isEndOfWord = i === word.length;
          
          // Check if node already exists
          if (!nodeMap.has(currentPrefix) && nodeId <= maxNodes) {
            const newNode = {
              id: nodeId,
              character: char.toUpperCase(),
              prefix: currentPrefix,
              isEndOfWord,
              frequency: isEndOfWord ? Math.floor(Math.random() * 100) + 10 : 0,
              depth: i,
              childCount: 0,
              word: isEndOfWord ? word : undefined
            };
            
            mockNodes.push(newNode);
            nodeMap.set(currentPrefix, newNode);
            
            // Add edge from parent
            const parentNode = nodeMap.get(parentPrefix);
            if (parentNode) {
              mockEdges.push({ from: parentNode.id, to: nodeId });
              parentNode.childCount++;
            }
            
            nodeId++;
          } else if (nodeMap.has(currentPrefix) && isEndOfWord) {
            // Update existing node to mark as end of word
            const existingNode = nodeMap.get(currentPrefix);
            existingNode.isEndOfWord = true;
            existingNode.frequency = Math.floor(Math.random() * 100) + 10;
            existingNode.word = word;
          }
        }
      });
      
      // Debug logging
      console.log('Mock Trie Data Generated:');
      console.log('Filtered words:', filteredWords);
      console.log('Nodes:', mockNodes.length);
      console.log('Edges:', mockEdges.length);
      console.log('Sample nodes:', mockNodes.slice(0, 10));
      console.log('Sample edges:', mockEdges.slice(0, 10));
      
      return {
        structure: {
          nodes: mockNodes.slice(0, maxNodes),
          edges: mockEdges,
          totalNodes: mockNodes.length,
          totalWords: filteredWords.length,
          maxDepth: depth
        },
        metadata: {
          depth,
          maxNodes,
          prefix,
          totalNodes: mockNodes.length,
          totalWords: filteredWords.length,
          maxDepth: depth
        }
      };
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