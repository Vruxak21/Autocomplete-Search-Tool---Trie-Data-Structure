import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import VisualizationPage from './VisualizationPage';

// Mock the TrieVisualization component
vi.mock('../components/TrieVisualization', () => ({
  default: ({ currentQuery }) => (
    <div data-testid="trie-visualization">
      Trie Visualization - Query: {currentQuery}
    </div>
  )
}));

const renderWithRouter = (initialEntries = ['/visualization']) => {
  return render(
    <BrowserRouter>
      <VisualizationPage />
    </BrowserRouter>
  );
};

describe('VisualizationPage Component', () => {
  it('renders page title and description', () => {
    renderWithRouter();
    
    expect(screen.getByText('Trie Data Structure Visualization')).toBeInTheDocument();
    expect(screen.getByText(/Explore how the Trie \(prefix tree\) data structure/)).toBeInTheDocument();
  });

  it('renders query input for visualization', () => {
    renderWithRouter();
    
    const queryInput = screen.getByLabelText(/Enter a query to highlight the path/);
    expect(queryInput).toBeInTheDocument();
    expect(queryInput).toHaveAttribute('placeholder', 'Type to see path highlighting...');
  });

  it('updates visualization query when input changes', () => {
    renderWithRouter();
    
    const queryInput = screen.getByLabelText(/Enter a query to highlight the path/);
    fireEvent.change(queryInput, { target: { value: 'test' } });
    
    expect(screen.getByText('Trie Visualization - Query: test')).toBeInTheDocument();
  });

  it('renders algorithm information cards', () => {
    renderWithRouter();
    
    expect(screen.getByText('Time Complexity')).toBeInTheDocument();
    expect(screen.getByText('Advantages')).toBeInTheDocument();
    expect(screen.getByText('Use Cases')).toBeInTheDocument();
    
    expect(screen.getByText('O(L) where L is query length')).toBeInTheDocument();
    expect(screen.getByText(/Fast prefix-based searches/)).toBeInTheDocument();
    expect(screen.getByText(/Search engines/)).toBeInTheDocument();
  });

  it('renders educational content section', () => {
    renderWithRouter();
    
    expect(screen.getByText('How It Works')).toBeInTheDocument();
    expect(screen.getByText('1. Tree Structure')).toBeInTheDocument();
    expect(screen.getByText('2. Search Process')).toBeInTheDocument();
    expect(screen.getByText('3. Frequency Ranking')).toBeInTheDocument();
    expect(screen.getByText('4. Memory Optimization')).toBeInTheDocument();
  });

  it('has responsive layout classes', () => {
    renderWithRouter();
    
    const infoCards = screen.getByText('Time Complexity').closest('.grid');
    expect(infoCards).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-3', 'gap-4');
    
    const educationalGrid = screen.getByText('1. Tree Structure').closest('.grid');
    expect(educationalGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
  });

  it('renders TrieVisualization component', () => {
    renderWithRouter();
    
    expect(screen.getByTestId('trie-visualization')).toBeInTheDocument();
  });

  it('has proper styling for information cards', () => {
    renderWithRouter();
    
    const timeComplexityCard = screen.getByText('Time Complexity').closest('div');
    expect(timeComplexityCard).toHaveClass('bg-blue-50', 'p-4', 'rounded-lg');
    
    const advantagesCard = screen.getByText('Advantages').closest('div');
    expect(advantagesCard).toHaveClass('bg-green-50', 'p-4', 'rounded-lg');
    
    const useCasesCard = screen.getByText('Use Cases').closest('div');
    expect(useCasesCard).toHaveClass('bg-purple-50', 'p-4', 'rounded-lg');
  });
});