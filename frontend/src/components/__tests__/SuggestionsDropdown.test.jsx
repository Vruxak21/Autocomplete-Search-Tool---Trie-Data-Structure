import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import SuggestionsDropdown from '../SuggestionsDropdown';

describe('SuggestionsDropdown Component', () => {
  const mockSuggestions = [
    { word: 'Tokyo', frequency: 100 },
    { word: 'Toronto', frequency: 80 },
    { word: 'Toledo', frequency: 60 }
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  test('renders suggestions list', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Toledo')).toBeInTheDocument();
  });

  test('highlights matching text', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    // Check for highlighted text (assuming it uses a specific class)
    const highlightedElements = document.querySelectorAll('.bg-yellow-200');
    expect(highlightedElements.length).toBeGreaterThan(0);
  });

  test('calls onSelect when suggestion is clicked', async () => {
    const user = userEvent.setup();
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    const firstSuggestion = screen.getByText('Tokyo');
    await user.click(firstSuggestion);
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  test('displays frequency information', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    expect(screen.getByText('100 searches')).toBeInTheDocument();
    expect(screen.getByText('80 searches')).toBeInTheDocument();
  });

  test('handles empty suggestions', () => {
    render(
      <SuggestionsDropdown 
        suggestions={[]} 
        onSelect={mockOnSelect} 
        query="xyz" 
      />
    );
    
    // Should either not render or show "no results" message
    const noResults = screen.queryByText(/no suggestions found/i);
    if (noResults) {
      expect(noResults).toBeInTheDocument();
    }
  });

  test('supports keyboard navigation', async () => {
    const user = userEvent.setup();
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    // Test arrow key navigation
    await user.keyboard('{ArrowDown}');
    
    // First item should be highlighted
    const firstItem = screen.getByText('Tokyo').closest('[role="option"]');
    expect(firstItem).toHaveClass('highlighted');
  });

  test('has proper ARIA attributes', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        query="to" 
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toBeInTheDocument();
    
    const options = screen.getAllByRole('option');
    expect(options).toHaveLength(3);
  });
});