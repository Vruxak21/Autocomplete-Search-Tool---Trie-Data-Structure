import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SuggestionsDropdown from './SuggestionsDropdown';
import { VIEW_MODES } from '../types/tree';

describe('SuggestionsDropdown Component', () => {
  const mockSuggestions = [
    { word: 'Tokyo', frequency: 100, category: 'city' },
    { word: 'Toronto', frequency: 80, category: 'city' },
    { word: 'Test', frequency: 50, category: 'other' },
  ];

  const mockOnSelect = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when not visible', () => {
    const { container } = render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={false} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders nothing when no suggestions provided', () => {
    const { container } = render(
      <SuggestionsDropdown 
        suggestions={[]} 
        isVisible={true} 
      />
    );
    
    expect(container.firstChild).toBeNull();
  });

  it('renders suggestions when visible and suggestions provided', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    expect(screen.getByRole('listbox')).toBeInTheDocument();
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('displays frequency scores alongside suggestions', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    expect(screen.getByText('100 searches')).toBeInTheDocument();
    expect(screen.getByText('80 searches')).toBeInTheDocument();
    expect(screen.getByText('50 searches')).toBeInTheDocument();
  });

  it('displays categories when provided', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    expect(screen.getAllByText('city')).toHaveLength(2);
    expect(screen.getByText('other')).toBeInTheDocument();
  });

  it('highlights matching prefix in suggestions', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        query="To" 
        isVisible={true} 
      />
    );
    
    // Check for highlighted text
    const highlightedElements = screen.getAllByText('To');
    expect(highlightedElements.length).toBeGreaterThan(0);
    
    // Check that highlighted text has correct classes
    highlightedElements.forEach(element => {
      expect(element).toHaveClass('bg-yellow-200', 'font-semibold');
    });
  });

  it('handles case-insensitive highlighting', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        query="to" 
        isVisible={true} 
      />
    );
    
    const highlightedElements = screen.getAllByText('To');
    expect(highlightedElements.length).toBeGreaterThan(0);
  });

  it('does not highlight when no query provided', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        query="" 
        isVisible={true} 
      />
    );
    
    // Text should be present but not highlighted
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.queryByText((content, element) => {
      return element?.classList.contains('bg-yellow-200');
    })).not.toBeInTheDocument();
  });

  it('applies selected styling to the correct suggestion', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        selectedIndex={1} 
        isVisible={true} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    expect(suggestions[0]).not.toHaveClass('bg-blue-50');
    expect(suggestions[1]).toHaveClass('bg-blue-50', 'text-blue-900');
    expect(suggestions[2]).not.toHaveClass('bg-blue-50');
  });

  it('applies hover effects to suggestions', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).toHaveClass('hover:bg-gray-50');
    });
  });

  it('calls onSelect when suggestion is clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        isVisible={true} 
      />
    );
    
    await user.click(screen.getByText('Tokyo'));
    
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[0]);
  });

  it('calls onSelect with correct suggestion when different items clicked', async () => {
    const user = userEvent.setup();
    
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        onSelect={mockOnSelect} 
        isVisible={true} 
      />
    );
    
    await user.click(screen.getByText('Toronto'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[1]);
    
    vi.clearAllMocks();
    
    await user.click(screen.getByText('Test'));
    expect(mockOnSelect).toHaveBeenCalledWith(mockSuggestions[2]);
  });

  it('does not call onSelect when onSelect prop is not provided', async () => {
    const user = userEvent.setup();
    
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    // Should not throw error when clicking without onSelect
    await user.click(screen.getByText('Tokyo'));
    // Test passes if no error is thrown
  });

  it('applies custom className', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
        className="custom-dropdown-class" 
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toHaveClass('custom-dropdown-class');
  });

  it('has proper accessibility attributes', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        selectedIndex={1} 
        isVisible={true} 
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toHaveAttribute('aria-label', 'Search suggestions');
    
    const suggestions = screen.getAllByRole('option');
    expect(suggestions[0]).toHaveAttribute('aria-selected', 'false');
    expect(suggestions[1]).toHaveAttribute('aria-selected', 'true');
    expect(suggestions[2]).toHaveAttribute('aria-selected', 'false');
  });

  it('includes test ids for suggestions', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    expect(screen.getByTestId('suggestion-0')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-1')).toBeInTheDocument();
    expect(screen.getByTestId('suggestion-2')).toBeInTheDocument();
  });

  it('handles suggestions without categories gracefully', () => {
    const suggestionsWithoutCategory = [
      { word: 'Tokyo', frequency: 100 },
      { word: 'Toronto', frequency: 80 },
    ];
    
    render(
      <SuggestionsDropdown 
        suggestions={suggestionsWithoutCategory} 
        isVisible={true} 
      />
    );
    
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('100 searches')).toBeInTheDocument();
    expect(screen.getByText('80 searches')).toBeInTheDocument();
  });

  it('handles empty query for highlighting', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        query="" 
        isVisible={true} 
      />
    );
    
    // Should render suggestions without highlighting
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('handles query that does not match any suggestion', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        query="xyz" 
        isVisible={true} 
      />
    );
    
    // Should render suggestions without highlighting since no match
    expect(screen.getByText('Tokyo')).toBeInTheDocument();
    expect(screen.getByText('Toronto')).toBeInTheDocument();
    expect(screen.getByText('Test')).toBeInTheDocument();
    
    // No highlighted text should be present
    expect(screen.queryByText((content, element) => {
      return element?.classList.contains('bg-yellow-200');
    })).not.toBeInTheDocument();
  });

  it('handles selectedIndex out of bounds gracefully', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        selectedIndex={10} 
        isVisible={true} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).not.toHaveClass('bg-blue-50');
    });
  });

  it('handles negative selectedIndex gracefully', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        selectedIndex={-1} 
        isVisible={true} 
      />
    );
    
    const suggestions = screen.getAllByRole('option');
    suggestions.forEach(suggestion => {
      expect(suggestion).not.toHaveClass('bg-blue-50');
    });
  });

  it('forwards ref correctly', () => {
    const ref = { current: null };
    
    render(
      <SuggestionsDropdown 
        ref={ref}
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    expect(ref.current).toBeInstanceOf(HTMLDivElement);
    expect(ref.current).toHaveAttribute('role', 'listbox');
  });

  it('renders with proper positioning and styling classes', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
      />
    );
    
    const dropdown = screen.getByRole('listbox');
    expect(dropdown).toHaveClass(
      'absolute',
      'top-full',
      'left-0',
      'right-0',
      'z-50',
      'mt-1',
      'max-h-80',
      'overflow-auto',
      'rounded-lg',
      'border',
      'border-gray-200',
      'bg-white',
      'shadow-lg'
    );
  });

  it('applies transition classes to suggestion items', () => {
    render(
      <SuggestionsDropdown 
        suggestions={mockSuggestions} 
        isVisible={true} 
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

  describe('Multi-View Functionality', () => {
    const mockOnViewModeChange = vi.fn();

    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders in list view by default', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true} 
        />
      );
      
      expect(screen.getByRole('listbox')).toBeInTheDocument();
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('shows view toggle when showViewToggle is true', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          showViewToggle={true}
        />
      );
      
      expect(screen.getByTestId('list-view-button')).toBeInTheDocument();
      expect(screen.getByTestId('tree-view-button')).toBeInTheDocument();
    });

    it('hides view toggle when showViewToggle is false', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          showViewToggle={false}
        />
      );
      
      expect(screen.queryByTestId('list-view-button')).not.toBeInTheDocument();
      expect(screen.queryByTestId('tree-view-button')).not.toBeInTheDocument();
    });

    it('renders in tree view when viewMode is set to tree', async () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
        />
      );
      
      // Wait for tree building to complete
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
    });

    it('calls onViewModeChange when view toggle is clicked', async () => {
      const user = userEvent.setup();
      
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.LIST}
          onViewModeChange={mockOnViewModeChange}
          showViewToggle={true}
        />
      );
      
      await user.click(screen.getByTestId('tree-view-button'));
      
      expect(mockOnViewModeChange).toHaveBeenCalledWith(
        VIEW_MODES.TREE,
        expect.any(Object)
      );
    });

    it('shows loading state when building tree', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
        />
      );
      
      expect(screen.getByText('Building tree view...')).toBeInTheDocument();
    });

    it('handles tree building errors gracefully', async () => {
      // Mock TreeBuilder to throw an error
      const mockSuggestions = [
        { word: 'test', frequency: 1 }
      ];
      
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          treeConfig={{ buildTimeout: 1 }} // Very short timeout to trigger error
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Failed to build tree view')).toBeInTheDocument();
      });
      
      expect(screen.getByText('Switch to List View')).toBeInTheDocument();
    });

    it('falls back to list view when tree building fails', async () => {
      const user = userEvent.setup();
      
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          treeConfig={{ buildTimeout: 1 }}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByText('Switch to List View')).toBeInTheDocument();
      });
      
      await user.click(screen.getByText('Switch to List View'));
      
      expect(screen.getByTestId('list-view')).toBeInTheDocument();
    });

    it('handles selection in tree view', async () => {
      const user = userEvent.setup();
      
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          onSelect={mockOnSelect}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
      
      // Find and click a tree node (word node)
      const treeNodes = screen.getAllByRole('treeitem');
      if (treeNodes.length > 0) {
        await user.click(treeNodes[0]);
        expect(mockOnSelect).toHaveBeenCalled();
      }
    });

    it('preserves custom className in both views', () => {
      const { rerender } = render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.LIST}
          className="custom-class"
        />
      );
      
      const container = screen.getByTestId('list-view').closest('.custom-class');
      expect(container).toBeInTheDocument();
      
      rerender(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          className="custom-class"
        />
      );
      
      // Tree view container should have custom class
      const treeContainer = screen.getByRole('tree').closest('.custom-class');
      expect(treeContainer).toBeInTheDocument();
    });

    it('handles empty suggestions in tree view', () => {
      render(
        <SuggestionsDropdown 
          suggestions={[]} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
        />
      );
      
      // Should not render anything for empty suggestions
      expect(screen.queryByRole('tree')).not.toBeInTheDocument();
    });

    it('disables view toggle during tree building', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          showViewToggle={true}
        />
      );
      
      const treeButton = screen.getByTestId('tree-view-button');
      const listButton = screen.getByTestId('list-view-button');
      
      expect(treeButton).toBeDisabled();
      expect(listButton).toBeDisabled();
    });

    it('applies correct ARIA attributes for tree view', async () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
        />
      );
      
      await waitFor(() => {
        const container = screen.getByRole('tree');
        expect(container).toHaveAttribute('aria-label', 'Search suggestions tree');
        expect(container).toHaveAttribute('id', 'suggestions-content');
      });
    });

    it('applies correct ARIA attributes for list view', () => {
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.LIST}
        />
      );
      
      const listView = screen.getByTestId('list-view');
      expect(listView).toHaveAttribute('aria-label', 'Search suggestions list');
      
      const container = screen.getByText('Tokyo').closest('#suggestions-content');
      expect(container).toBeInTheDocument();
    });

    it('handles tree configuration options', async () => {
      const customConfig = {
        maxDepth: 5,
        minGroupSize: 3,
        virtualScrollThreshold: 25,
        buildTimeout: 500
      };
      
      render(
        <SuggestionsDropdown 
          suggestions={mockSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
          treeConfig={customConfig}
        />
      );
      
      // Should not throw error with custom config
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
    });
  });

  describe('Typo Correction Support', () => {
    const typoSuggestions = [
      { 
        word: 'Tokyo', 
        frequency: 100, 
        type: 'typo_correction',
        originalQuery: 'Tokio',
        editDistance: 1,
        similarity: 0.9
      },
      { word: 'Toronto', frequency: 80, type: 'exact_match' }
    ];

    it('displays typo correction indicators in list view', () => {
      render(
        <SuggestionsDropdown 
          suggestions={typoSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.LIST}
        />
      );
      
      expect(screen.getByText('Did you mean?')).toBeInTheDocument();
      expect(screen.getByText('Original: "Tokio" • Edit distance: 1 • Similarity: 90%')).toBeInTheDocument();
    });

    it('handles typo corrections in tree view', async () => {
      render(
        <SuggestionsDropdown 
          suggestions={typoSuggestions} 
          isVisible={true}
          viewMode={VIEW_MODES.TREE}
        />
      );
      
      await waitFor(() => {
        expect(screen.getByRole('tree')).toBeInTheDocument();
      });
      
      // Tree should be built successfully with typo corrections
      expect(screen.queryByText('Failed to build tree view')).not.toBeInTheDocument();
    });
  });
});