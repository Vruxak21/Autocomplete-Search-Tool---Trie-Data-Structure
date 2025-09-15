import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SearchPage from './SearchPage';

// Mock the SearchInput component
vi.mock('../components/SearchInput', () => ({
  default: ({ onSearch, onSelect, className }) => (
    <div data-testid="search-input" className={className}>
      <input 
        placeholder="Search input mock"
        onChange={(e) => onSearch(e.target.value, [])}
      />
    </div>
  )
}));

describe('SearchPage Component', () => {
  it('renders page title and description', () => {
    render(<SearchPage />);
    
    expect(screen.getByText('Search Interface')).toBeInTheDocument();
    expect(screen.getByText(/Start typing to see real-time autocomplete suggestions/)).toBeInTheDocument();
  });

  it('renders SearchInput component', () => {
    render(<SearchPage />);
    
    expect(screen.getByTestId('search-input')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search input mock')).toBeInTheDocument();
  });

  it('renders features overview section', () => {
    render(<SearchPage />);
    
    expect(screen.getByText('Features Implemented:')).toBeInTheDocument();
    expect(screen.getByText('Performance')).toBeInTheDocument();
    expect(screen.getByText('User Experience')).toBeInTheDocument();
    expect(screen.getByText('Accessibility')).toBeInTheDocument();
    expect(screen.getByText('Data Features')).toBeInTheDocument();
  });

  it('displays feature checkmarks', () => {
    render(<SearchPage />);
    
    expect(screen.getByText(/✅ Real-time search with 300ms debounce/)).toBeInTheDocument();
    expect(screen.getByText(/✅ Sub-100ms response times/)).toBeInTheDocument();
    expect(screen.getByText(/✅ Keyboard navigation/)).toBeInTheDocument();
    expect(screen.getByText(/✅ ARIA attributes for screen readers/)).toBeInTheDocument();
  });

  it('has responsive grid layout for features', () => {
    render(<SearchPage />);
    
    const featuresGrid = screen.getByText('Performance').closest('.grid');
    expect(featuresGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'gap-4');
  });

  it('centers content appropriately', () => {
    render(<SearchPage />);
    
    const mainContainer = screen.getByText('Search Interface').closest('.text-center');
    expect(mainContainer).toHaveClass('text-center');
    
    const searchContainer = screen.getByTestId('search-input').closest('.max-w-2xl');
    expect(searchContainer).toHaveClass('mx-auto', 'max-w-2xl');
  });
});