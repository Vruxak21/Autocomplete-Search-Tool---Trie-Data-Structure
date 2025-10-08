/**
 * @fileoverview Tests for ListView component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ListView from './ListView';

describe('ListView Component', () => {
  const mockSuggestions = [
    { word: 'Tokyo', frequency: 100, category: 'city' },
    { word: 'Toronto', frequency: 80, category: 'city' },
    { word: 'Test', frequency: 50, category: 'other' },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders suggestions list correctly', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    expect(screen.getByTestId('list-view')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('displays empty state when no suggestions', () => {
    render(<ListView suggestions={[]} />);
    
    expect(screen.getByText('No suggestions found')).toBeInTheDocument();
    expect(screen.queryByTestId('list-view')).not.toBeInTheDocument();
  });

  it('displays empty state when suggestions is null/undefined', () => {
    render(<ListView suggestions={null} />);
    
    expect(screen.getByText('No suggestions found')).toBeInTheDocument();
  });

  it('highlights matching text in suggestions', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        query="To"
      />
    );
    
    const highlightedElements = screen.getAllByText('To');
    expect(highlightedElements.length).toBeGreaterThan(0);
    
    highlightedElements.forEach(element => {
      expect(element).toHaveClass('bg-yellow-200', 'font-semibold');
    });
  });

  it('handles case-insensitive highlighting', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        query="to"
      />
    );
    
    const highlightedElements = screen.getAllByText('To');
    expect(highlightedElements.length).toBeGreaterThan(0);
  });

  it('does not highlight when no query provided', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        query=""
      />
    );
    
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.queryByText((content, element) => {
      return element?.classList.contains('bg-yellow-200');
    })).not.toBeInTheDocument();
  });

  it('applies selected styling to correct item', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        selectedIndex={1}
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    expect(suggestions[0]).not.toHaveClass('bg-blue-50');
    expect(suggestions[1]).toHaveClass('bg-blue-50', 'text-blue-900');
    expect(suggestions[2]).not.toHaveClass('bg-blue-50');
  });

  it('handles out of bounds selectedIndex gracefully', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        selectedIndex={10}
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).not.toHaveClass('bg-blue-50');
    });
  });

  it('calls onSelect when suggestion is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect}
      />
    );
    
    await user.click(screen.getByText('Tokyo'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('displays frequency information', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    expect(screen.getByText('100 searches')).toBeInTheDocument();
    expect(screen.getByText('80 searches')).toBeInTheDocument();
    expect(screen.getByText('50 searches')).toBeInTheDocument();
  });

  it('displays category information when available', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    expect(screen.getAllByText('city')).toHaveLength(2);
    expect(screen.getByText('other')).toBeInTheDocument();
  });

  it('handles typo correction suggestions', () => {
    const typoSuggestions = [
      { 
        word: 'Tokyo', 
        frequency: 100, 
        type: 'typo_correction',
        originalQuery: 'Tokio',
        editDistance: 1,
        similarity: 0.9
      }
    ];
    
    render(
      <ListView 
        suggestions={typoSuggestions} 
      />
    );
    
    expect(screen.getByText('Did you mean?')).toBeInTheDocument();
    expect(screen.getByText('Original: "Tokio" • Edit distance: 1 • Similarity: 90%')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        className="custom-list-class"
      />
    );
    
    const listView = screen.getByTestId('list-view');
    expect(listView).toHaveClass('custom-list-class');
  });

  it('has proper accessibility attributes', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        selectedIndex={1}
      />
    );
    
    const listbox = screen.getByRole('listbox');
    expect(listbox).toHaveAttribute('aria-label', 'Search suggestions list');
    
    const suggestions = screen.getAllByRole('option');
    expect(suggestions[0]).toHaveAttribute('aria-selected', 'false');
    expect(suggestions[1]).toHaveAttribute('aria-selected', 'true');
    expect(suggestions[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('includes test ids for suggestions', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-1')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-2')).toBeInTheDocument();
  });

  it('handles suggestions without categories', () => {
    const suggestionsWithoutCategory = [
      { word: 'Tokyo', frequency: 100 },
      { word: 'Toronto', frequency: 80 },
    ];
    
    render(
      <ListView 
        suggestions={suggestionsWithoutCategory} 
      />
    );
    
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('100 searches')).toBeInTheDocument();
    expect(screen.getByText('80 searches')).toBeInTheDocument();
  });

  it('applies hover effects', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveClass('hover:bg-gray-50');
    });
  });

  it('applies proper styling classes', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveClass(
        'cursor-pointer',
        'border-b',
        'border-gray-100',
        'px-4',
        'py-3',
        'transition-colors',
        'duration-150'
      );
    });
  });

  it('handles query that does not match any suggestion', () => {
    render(
      <ListView 
        suggestions={mockSuggestions} 
        query="xyz"
      />
    );
    
    // Should render suggestions without highlighting
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    // No highlighted text should be present
    expect(screen.queryByText((content, element) => {
      return element?.classList.contains('bg-yellow-200');
    })).not.toBeInTheDocument();
  });

  it('does not call onSelect when onSelect prop is not provided', async () => {
    const user = userEvent.setup();
    
    render(
      <ListView 
        suggestions={mockSuggestions} 
      />
    );
    
    // Should not throw error when clicking without onSelect
    await user.click(screen.getByText('Tokyo'));
    // Test passes if no error is thrown
  });
});