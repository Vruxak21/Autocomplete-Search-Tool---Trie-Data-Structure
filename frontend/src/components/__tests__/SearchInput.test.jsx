import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SearchInput from '../SearchInput';

// Mock axios
vi.mock('axios', () => ({
  default: {
    get: vi.fn()
  }
}));

describe('SearchInput Component', () => {
  const mockOnSearch = vi.fn();
  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders search input with placeholder', () => {
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByPlaceholderText(/start typing to see suggestions/i);
    expect(input).toBeInTheDocument();
  });

  test('calls onSearch when user types', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    await user.type(input, 'test');
    
    // Should debounce the calls
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledWith('test');
    }, { timeout: 500 });
  });

  test('debounces search requests', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    
    // Type quickly
    await user.type(input, 'hello', { delay: 50 });
    
    // Should only call onSearch once after debounce
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenCalledTimes(1);
    }, { timeout: 500 });
  });

  test('clears suggestions when input is empty', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    
    // Type and then clear
    await user.type(input, 'test');
    await user.clear(input);
    
    await waitFor(() => {
      expect(mockOnSearch).toHaveBeenLastCalledWith('');
    });
  });

  test('handles keyboard navigation', async () => {
    const user = userEvent.setup();
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    
    // Test Escape key
    await user.type(input, 'test');
    await user.keyboard('{Escape}');
    
    expect(input.value).toBe('');
  });

  test('supports accessibility features', () => {
    render(<SearchInput onSearch={mockOnSearch} onSelect={mockOnSelect} />);
    
    const input = screen.getByRole('textbox');
    
    expect(input).toHaveAttribute('aria-label');
    expect(input).toHaveAttribute('aria-autocomplete', 'list');
  });
});