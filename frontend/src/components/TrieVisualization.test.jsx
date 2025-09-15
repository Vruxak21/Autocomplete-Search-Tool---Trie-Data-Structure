import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import TrieVisualization from './TrieVisualization';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock D3 to avoid DOM manipulation issues in tests
vi.mock('d3', () => {
  const mockSelection = {
    selectAll: vi.fn().mockReturnThis(),
    remove: vi.fn().mockReturnThis(),
    attr: vi.fn().mockReturnThis(),
    append: vi.fn().mockReturnThis(),
    text: vi.fn().mockReturnThis(),
    data: vi.fn().mockReturnThis(),
    enter: vi.fn().mockReturnThis(),
    style: vi.fn().mockReturnThis(),
    on: vi.fn().mockReturnThis(),
    filter: vi.fn().mockReturnThis()
  };

  const mockTreeLayout = vi.fn((root) => {
    // Mock tree layout behavior
    if (root && root.descendants) {
      return root;
    }
    return root;
  });

  mockTreeLayout.size = vi.fn().mockReturnValue(mockTreeLayout);
  mockTreeLayout.separation = vi.fn().mockReturnValue(mockTreeLayout);

  return {
    select: vi.fn(() => mockSelection),
    hierarchy: vi.fn((data) => ({
      descendants: vi.fn(() => []),
      links: vi.fn(() => []),
      data
    })),
    tree: vi.fn(() => mockTreeLayout),
    linkVertical: vi.fn(() => ({
      x: vi.fn().mockReturnThis(),
      y: vi.fn().mockReturnThis()
    }))
  };
});

describe('TrieVisualization', () => {
  const mockTrieStructureResponse = {
    data: {
      structure: {
        nodes: [
          {
            id: 0,
            character: 'ROOT',
            prefix: '',
            isEndOfWord: false,
            frequency: 0,
            word: null,
            depth: 0,
            childCount: 2
          },
          {
            id: 1,
            character: 'h',
            prefix: 'h',
            isEndOfWord: false,
            frequency: 0,
            word: null,
            depth: 1,
            childCount: 1
          },
          {
            id: 2,
            character: 'e',
            prefix: 'he',
            isEndOfWord: false,
            frequency: 0,
            word: null,
            depth: 2,
            childCount: 1
          },
          {
            id: 3,
            character: 'l',
            prefix: 'hel',
            isEndOfWord: false,
            frequency: 0,
            word: null,
            depth: 3,
            childCount: 2
          },
          {
            id: 4,
            character: 'l',
            prefix: 'hell',
            isEndOfWord: false,
            frequency: 0,
            word: null,
            depth: 4,
            childCount: 1
          },
          {
            id: 5,
            character: 'o',
            prefix: 'hello',
            isEndOfWord: true,
            frequency: 10,
            word: 'hello',
            depth: 5,
            childCount: 0
          },
          {
            id: 6,
            character: 'p',
            prefix: 'help',
            isEndOfWord: true,
            frequency: 5,
            word: 'help',
            depth: 4,
            childCount: 0
          }
        ],
        edges: [
          { from: 0, to: 1, character: 'h' },
          { from: 1, to: 2, character: 'e' },
          { from: 2, to: 3, character: 'l' },
          { from: 3, to: 4, character: 'l' },
          { from: 4, to: 5, character: 'o' },
          { from: 3, to: 6, character: 'p' }
        ],
        totalNodes: 7,
        totalWords: 2,
        maxDepth: 5
      },
      metadata: {
        prefix: '',
        depth: 4,
        totalNodes: 7,
        totalWords: 2,
        maxDepth: 5
      },
      trieStats: {
        wordCount: 2,
        nodeCount: 7,
        maxDepth: 5,
        averageDepth: 4.5
      }
    }
  };

  const mockComplexityResponse = {
    data: {
      timeComplexity: {
        search: 'O(L)',
        insert: 'O(L)',
        delete: 'O(L)',
        description: 'L is the length of the word/query'
      },
      spaceComplexity: {
        worst: 'O(ALPHABET_SIZE * N * M)',
        average: 'O(N * M)',
        description: 'N is number of words, M is average word length, ALPHABET_SIZE is character set size'
      },
      currentStats: {
        wordCount: 2,
        nodeCount: 7,
        maxDepth: 5,
        averageDepth: 4.5,
        memoryEfficiency: 75.5
      },
      advantages: [
        'Fast prefix-based searches',
        'Memory efficient for large dictionaries with common prefixes'
      ],
      disadvantages: [
        'Higher memory usage for sparse datasets',
        'Complex implementation compared to hash tables'
      ]
    }
  };

  const mockPathResponse = {
    data: {
      query: 'hel',
      path: [
        {
          character: 'h',
          prefix: 'h',
          isEndOfWord: false,
          frequency: 0,
          word: null
        },
        {
          character: 'e',
          prefix: 'he',
          isEndOfWord: false,
          frequency: 0,
          word: null
        },
        {
          character: 'l',
          prefix: 'hel',
          isEndOfWord: false,
          frequency: 0,
          word: null
        }
      ],
      exists: true,
      isCompleteWord: false,
      frequency: 0,
      suggestions: [
        { word: 'hello', frequency: 10 },
        { word: 'help', frequency: 5 }
      ]
    }
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Setup default mock responses
    mockedAxios.get.mockImplementation((url) => {
      if (url === '/api/trie/structure') {
        return Promise.resolve(mockTrieStructureResponse);
      }
      if (url === '/api/trie/complexity') {
        return Promise.resolve(mockComplexityResponse);
      }
      if (url === '/api/trie/path') {
        return Promise.resolve(mockPathResponse);
      }
      return Promise.reject(new Error('Unknown endpoint'));
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Component Rendering', () => {
    it('should render loading state initially', () => {
      render(<TrieVisualization />);
      
      expect(screen.getByText('Loading Trie visualization...')).toBeInTheDocument();
      expect(screen.getByRole('status')).toBeInTheDocument();
    });

    it('should render visualization after data loads', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Data Structure - Time Complexity Analysis')).toBeInTheDocument();
      });

      expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      expect(screen.getByText('Click on nodes to explore. Blue path shows current search query.')).toBeInTheDocument();
    });

    it('should display complexity information correctly', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Time Complexity:')).toBeInTheDocument();
      });

      expect(screen.getByText(/Search:/)).toBeInTheDocument();
      expect(screen.getByText(/Insert:/)).toBeInTheDocument();
      expect(screen.getByText(/Delete:/)).toBeInTheDocument();
      expect(screen.getByText(/Words:/)).toBeInTheDocument();
      expect(screen.getByText(/Nodes:/)).toBeInTheDocument();
      expect(screen.getByText(/Max Depth:/)).toBeInTheDocument();
      expect(screen.getByText(/Memory Efficiency:/)).toBeInTheDocument();
    });

    it('should display visualization controls', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Depth 3')).toBeInTheDocument();
      });

      expect(screen.getByText('Depth 4')).toBeInTheDocument();
      expect(screen.getByText('Depth 5')).toBeInTheDocument();
    });

    it('should display legend correctly', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Regular Node')).toBeInTheDocument();
      });

      expect(screen.getByText('End of Word')).toBeInTheDocument();
      expect(screen.getByText('Search Path')).toBeInTheDocument();
      expect(screen.getByText('Selected Node')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should display error message when API fails', async () => {
      mockedAxios.get.mockRejectedValue({
        response: {
          data: {
            message: 'Trie service unavailable'
          }
        }
      });

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Visualization Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Trie service unavailable')).toBeInTheDocument();
      expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    it('should handle network errors gracefully', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Visualization Error')).toBeInTheDocument();
      });

      expect(screen.getByText('Failed to load Trie structure')).toBeInTheDocument();
    });

    it('should allow retry after error', async () => {
      mockedAxios.get.mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce(mockTrieStructureResponse)
        .mockResolvedValueOnce(mockComplexityResponse);

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Retry')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Retry'));

      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      }, { timeout: 2000 });
    });
  });

  describe('Interactive Features', () => {
    it('should fetch different depth levels when buttons are clicked', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Depth 3')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Depth 3'));

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/trie/structure', {
        params: { depth: 3, prefix: '' }
      });
    });

    it('should display current query in controls when provided', async () => {
      render(<TrieVisualization currentQuery="hello" />);
      
      await waitFor(() => {
        expect(screen.getByText('Highlighting path for:')).toBeInTheDocument();
      });

      expect(screen.getByText('"hello"')).toBeInTheDocument();
    });

    it('should fetch path data when currentQuery changes', async () => {
      const { rerender } = render(<TrieVisualization currentQuery="" />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      rerender(<TrieVisualization currentQuery="hel" />);

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/trie/path', {
          params: { query: 'hel' }
        });
      });
    });

    it('should display path analysis when path data is available', async () => {
      render(<TrieVisualization currentQuery="hel" />);
      
      await waitFor(() => {
        expect(screen.getByText('Search Path Analysis')).toBeInTheDocument();
      });

      expect(screen.getByText(/Query:/)).toBeInTheDocument();
      expect(screen.getByText(/Path Exists:/)).toBeInTheDocument();
      expect(screen.getByText(/Complete Word:/)).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('should handle empty Trie structure gracefully', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url === '/api/trie/structure') {
          return Promise.resolve({
            data: {
              structure: {
                nodes: [],
                edges: [],
                totalNodes: 0,
                totalWords: 0,
                maxDepth: 0
              }
            }
          });
        }
        if (url === '/api/trie/complexity') {
          return Promise.resolve(mockComplexityResponse);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      // Should not crash with empty data
      expect(screen.getByText('Click on nodes to explore. Blue path shows current search query.')).toBeInTheDocument();
    });

    it('should not fetch path data for empty queries', async () => {
      render(<TrieVisualization currentQuery="" />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      // Should not call path API for empty query
      expect(mockedAxios.get).not.toHaveBeenCalledWith('/api/trie/path', expect.anything());
    });

    it('should handle path data fetch errors gracefully', async () => {
      mockedAxios.get.mockImplementation((url) => {
        if (url === '/api/trie/structure') {
          return Promise.resolve(mockTrieStructureResponse);
        }
        if (url === '/api/trie/complexity') {
          return Promise.resolve(mockComplexityResponse);
        }
        if (url === '/api/trie/path') {
          return Promise.reject(new Error('Path not found'));
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<TrieVisualization currentQuery="xyz" />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      // Should not display path analysis section when path fetch fails
      expect(screen.queryByText('Search Path Analysis')).not.toBeInTheDocument();
    });
  });

  describe('Responsive Design', () => {
    it('should handle container resize', async () => {
      // Mock getBoundingClientRect
      const mockGetBoundingClientRect = vi.fn(() => ({
        width: 1200,
        height: 800
      }));

      Object.defineProperty(Element.prototype, 'getBoundingClientRect', {
        value: mockGetBoundingClientRect
      });

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      // Component should render without errors
      expect(screen.getByText('Click on nodes to explore. Blue path shows current search query.')).toBeInTheDocument();
    });
  });

  describe('API Integration', () => {
    it('should make correct API calls on component mount', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/trie/structure', {
          params: { depth: 4, prefix: '' }
        });
      });

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/trie/complexity');
    });

    it('should pass correct parameters to structure API', async () => {
      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Depth 5')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Depth 5'));

      expect(mockedAxios.get).toHaveBeenCalledWith('/api/trie/structure', {
        params: { depth: 5, prefix: '' }
      });
    });

    it('should handle API response format correctly', async () => {
      const customResponse = {
        data: {
          structure: {
            nodes: [
              {
                id: 0,
                character: 'ROOT',
                prefix: '',
                isEndOfWord: false,
                frequency: 0,
                word: null,
                depth: 0,
                childCount: 1
              }
            ],
            edges: [],
            totalNodes: 1,
            totalWords: 0,
            maxDepth: 0
          },
          metadata: {
            prefix: '',
            depth: 4,
            totalNodes: 1,
            totalWords: 0,
            maxDepth: 0
          }
        }
      };

      mockedAxios.get.mockImplementation((url) => {
        if (url === '/api/trie/structure') {
          return Promise.resolve(customResponse);
        }
        if (url === '/api/trie/complexity') {
          return Promise.resolve(mockComplexityResponse);
        }
        return Promise.reject(new Error('Unknown endpoint'));
      });

      render(<TrieVisualization />);
      
      await waitFor(() => {
        expect(screen.getByText('Trie Structure Visualization')).toBeInTheDocument();
      });

      // Should handle the response without errors
      expect(screen.getByText('Click on nodes to explore. Blue path shows current search query.')).toBeInTheDocument();
    });
  });
});