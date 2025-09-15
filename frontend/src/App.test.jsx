import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import App from './App';

// Mock the page components to avoid complex dependencies
vi.mock('./pages/SearchPage', () => ({
  default: () => <div data-testid="search-page">Search Page Content</div>
}));

vi.mock('./pages/VisualizationPage', () => ({
  default: () => <div data-testid="visualization-page">Visualization Page Content</div>
}));

vi.mock('./pages/PerformancePage', () => ({
  default: () => <div data-testid="performance-page">Performance Page Content</div>
}));

describe('App Component', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('Auto-Complete Search Tool')).toBeInTheDocument();
  });

  it('renders search page by default', () => {
    render(<App />);
    expect(screen.getByTestId('search-page')).toBeInTheDocument();
  });

  it('navigates to visualization page when link is clicked', () => {
    render(<App />);
    
    const visualizationLink = screen.getByRole('link', { name: 'Trie Visualization' });
    fireEvent.click(visualizationLink);
    
    expect(screen.getByTestId('visualization-page')).toBeInTheDocument();
  });

  it('navigates to performance page when link is clicked', () => {
    render(<App />);
    
    const performanceLink = screen.getByRole('link', { name: 'Performance' });
    fireEvent.click(performanceLink);
    
    expect(screen.getByTestId('performance-page')).toBeInTheDocument();
  });

  it.skip('highlights active navigation link', async () => {
    render(<App />);
    
    const searchLink = screen.getByRole('link', { name: 'Search' });
    expect(searchLink).toHaveClass('border-blue-500');
    expect(searchLink).toHaveClass('text-blue-600');
    
    const visualizationLink = screen.getByRole('link', { name: 'Trie Visualization' });
    fireEvent.click(visualizationLink);
    
    await waitFor(() => {
      expect(visualizationLink).toHaveClass('border-blue-500');
      expect(visualizationLink).toHaveClass('text-blue-600');
      expect(searchLink).toHaveClass('border-transparent');
      expect(searchLink).toHaveClass('text-gray-500');
    });
  });

  it('maintains responsive layout structure', () => {
    render(<App />);
    
    const mainContainer = screen.getByRole('main');
    expect(mainContainer).toHaveClass('mx-auto', 'max-w-7xl', 'px-4', 'py-6', 'sm:py-8', 'sm:px-6', 'lg:px-8');
  });

  it('includes proper semantic HTML structure', () => {
    render(<App />);
    
    expect(screen.getByRole('banner')).toBeInTheDocument(); // header
    expect(screen.getByRole('navigation')).toBeInTheDocument(); // nav
    expect(screen.getByRole('main')).toBeInTheDocument(); // main
    expect(screen.getByRole('contentinfo')).toBeInTheDocument(); // footer
  });
});