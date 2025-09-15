import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import axios from 'axios';
import SearchInput from './SearchInput';

// Mock axios
vi.mock('axios');
const mockedAxios = vi.mocked(axios);

// Mock lodash debounce to make tests synchronous
vi.mock('lodash', () => ({
  debounce: (fn) => {
    fn.cancel = vi.fn();
    return fn;
  },
}));

// Helper function to find text that might be split by highlighting
const findByTextContent = (text) => {
  return screen.getByText((content, element) => {
    return element?.textContent === text;
  });
};

describe('SearchInput Component', () => {
  const mockOnSearch = vi.fn();
  const mockOnSelect = vi.fn();
  
  const mockSuggestions = [
    { word: 'Tokyo', frequency: 100, category: 'city' },
    { word: 'Toronto', frequency: 80, category: 'city' },
    { word: 'Test', frequency: 50, category: 'other' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { suggestions: mockSuggestions }
    });
    mockedAxios.post.mockResolvedValue({});
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  it('renders search input with correct placeholder', () => {
    render(<SearchInput />);
    
    const input = screen.getByPlaceholderText('Start typing to see suggestions...');
    expect(input).toBeInTheDocument();
    expect(input).toHaveAttribute('type', 'text');
  });

  it('updates input value when user types', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'test');
    
    expect(input).toHaveValue('test');
  });

  it('makes API call when user types', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(mockedAxios.get).toHaveBeenCalledWith('/api/search', {
        params: { query: 'tok', limit: 5 },
        timeout: 5000,
      });
    });
  });

  it('displays suggestions when API returns results', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
      expect(screen.getByText('Toronto')).toBeInTheDocument();
      expect(screen.getByText('100 searches')).toBeInTheDocument();
    });
  });

  it('highlights matching text in suggestions', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      const highlightedText = screen.getByText('Tok');
      expect(highlightedText).toHaveClass('bg-yellow-200', 'font-semibold');
    });
  });

  it('calls onSearch callback when search is performed', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('tok', mockSuggestions);
    });
  });

  it('handles keyboard navigation with arrow keys', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    // Wait for suggestions to appear
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    // Navigate down
    await user.keyboard('{ArrowDown}');
    
    const firstSuggestion = screen.getByTestId('suggestion-0');
    expect(firstSuggestion).toHaveClass('bg-blue-50');
    
    // Navigate down again
    await user.keyboard('{ArrowDown}');
    
    const secondSuggestion = screen.getByTestId('suggestion-1');
    expect(secondSuggestion).toHaveClass('bg-blue-50');
  });

  it('handles keyboard navigation with arrow up', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    // Navigate up (should go to last item)
    await user.keyboard('{ArrowUp}');
    
    const lastSuggestion = screen.getByTestId('suggestion-2');
    expect(lastSuggestion).toHaveClass('bg-blue-50');
  });

  it('selects suggestion with Enter key', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    // Navigate to first suggestion and press Enter
    await user.keyboard('{ArrowDown}{Enter}');
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(input).toHaveValue('Tokyo');
  });

  it('closes suggestions with Escape key', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    await user.keyboard('{Escape}');
    
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Tokyo';
    })).not.toBeInTheDocument();
  });

  it('selects suggestion when clicked', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    await user.click(findByTextContent('Tokyo'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
    expect(input).toHaveValue('Tokyo');
  });

  it('increments frequency when suggestion is selected', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    await user.click(findByTextContent('Tokyo'));
    
    expect(mockedAxios.post).toHaveBeenCalledWith('/api/search/increment', {
      word: 'Tokyo'
    });
  });

  it('shows loading spinner during API request', async () => {
    // Mock a delayed response
    mockedAxios.get.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ data: { suggestions: mockSuggestions } }), 100)
      )
    );
    
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    // Check for loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('displays error message when API request fails', async () => {
    mockedAxios.get.mockRejectedValue(new Error('Network error'));
    
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch suggestions/)).toBeInTheDocument();
    });
  });

  it('displays timeout error message when request times out', async () => {
    const timeoutError = new Error('timeout');
    timeoutError.code = 'ECONNABORTED';
    mockedAxios.get.mockRejectedValue(timeoutError);
    
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(screen.getByText(/Search timeout/)).toBeInTheDocument();
    });
  });

  it('clears error message after 5 seconds', async () => {
    vi.useFakeTimers();
    mockedAxios.get.mockRejectedValue(new Error('Network error'));
    
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch suggestions/)).toBeInTheDocument();
    });
    
    // Fast-forward 5 seconds
    act(() => {
      vi.advanceTimersByTime(5000);
    });
    
    await waitFor(() => {
      expect(screen.queryByText(/Failed to fetch suggestions/)).not.toBeInTheDocument();
    });
    
    vi.useRealTimers();
  });

  it('shows "No suggestions found" when no results', async () => {
    mockedAxios.get.mockResolvedValue({ data: { suggestions: [] } });
    
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'xyz');
    
    await waitFor(() => {
      expect(screen.getByText(/No suggestions found for "xyz"/)).toBeInTheDocument();
    });
  });

  it('closes suggestions when clicking outside', async () => {
    const user = userEvent.setup();
    render(
      <div>
        <SearchInput />
        <div data-testid="outside">Outside element</div>
      </div>
    );
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    await user.click(screen.getByTestId('outside'));
    
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Tokyo';
    })).not.toBeInTheDocument();
  });

  it('clears suggestions when input is empty', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    await user.clear(input);
    
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Tokyo';
    })).not.toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(<SearchInput className="custom-class" />);
    
    const container = screen.getByRole('combobox').parentElement.parentElement;
    expect(container).toHaveClass('custom-class');
  });

  it('has proper accessibility attributes', () => {
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    expect(input).toHaveAttribute('aria-label', 'Search input');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    expect(input).toHaveAttribute('aria-haspopup', 'listbox');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });

  it('updates aria-expanded when suggestions are shown', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(input).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('shows suggestions when input is focused and has previous results', async () => {
    const user = userEvent.setup();
    render(<SearchInput />);
    
    const input = screen.getByRole('combobox');
    await user.type(input, 'tok');
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
    
    // Click outside to close suggestions
    await user.click(document.body);
    expect(screen.queryByText((content, element) => {
      return element?.textContent === 'Tokyo';
    })).not.toBeInTheDocument();
    
    // Focus input again
    await user.click(input);
    
    await waitFor(() => {
      expect(findByTextContent('Tokyo')).toBeInTheDocument();
    });
  });
});