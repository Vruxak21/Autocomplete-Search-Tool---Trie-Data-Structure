import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Layout from './Layout';

// Helper function to render Layout with Router
const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
};

describe('Layout Component', () => {
  it('renders header with application title', () => {
    renderWithRouter();
    
    expect(screen.getByText('Auto-Complete Search Tool')).toBeInTheDocument();
    expect(screen.getByText(/Real-time search suggestions with Trie data structure visualization/)).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    renderWithRouter();
    
    expect(screen.getByRole('link', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Trie Visualization' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Performance' })).toBeInTheDocument();
  });

  it('renders footer with copyright and performance info', () => {
    renderWithRouter();
    
    expect(screen.getByText(/© 2024 Auto-Complete Search Tool/)).toBeInTheDocument();
    expect(screen.getByText(/Response Time: <100ms/)).toBeInTheDocument();
    expect(screen.getByText(/Memory Optimized/)).toBeInTheDocument();
  });

  it('has responsive design classes', () => {
    renderWithRouter();
    
    const header = screen.getByRole('banner');
    expect(header).toHaveClass('bg-white', 'shadow-sm');
    
    const nav = screen.getByRole('navigation');
    expect(nav).toHaveClass('border-b', 'border-gray-200', 'bg-white', 'sticky', 'top-0', 'z-10');
  });

  it('navigation has proper accessibility attributes', () => {
    renderWithRouter();
    
    const searchLink = screen.getByRole('link', { name: 'Search' });
    const visualizationLink = screen.getByRole('link', { name: 'Trie Visualization' });
    const performanceLink = screen.getByRole('link', { name: 'Performance' });
    
    expect(searchLink).toHaveAttribute('href', '/');
    expect(visualizationLink).toHaveAttribute('href', '/visualization');
    expect(performanceLink).toHaveAttribute('href', '/performance');
  });

  it('applies mobile-friendly classes', () => {
    renderWithRouter();
    
    const headerContent = screen.getByText('Auto-Complete Search Tool').closest('.flex');
    expect(headerContent).toHaveClass('flex', 'flex-col', 'sm:flex-row');
    
    const navContainer = screen.getByRole('navigation').querySelector('div > div');
    expect(navContainer).toHaveClass('flex', 'space-x-4', 'sm:space-x-8', 'overflow-x-auto');
  });
});