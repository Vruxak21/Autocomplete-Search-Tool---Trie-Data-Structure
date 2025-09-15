import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import PerformancePage from './PerformancePage';

// Mock the PerformanceDashboard component
vi.mock('../components/PerformanceDashboard', () => ({
  default: () => <div data-testid="performance-dashboard">Performance Dashboard Content</div>
}));

describe('PerformancePage Component', () => {
  it('renders page title and description', () => {
    render(<PerformancePage />);
    
    expect(screen.getByText('Performance Monitoring')).toBeInTheDocument();
    expect(screen.getByText(/Monitor system performance, response times, and resource usage/)).toBeInTheDocument();
  });

  it('renders performance overview cards', () => {
    render(<PerformancePage />);
    
    expect(screen.getByText('Avg Response Time')).toBeInTheDocument();
    expect(screen.getByText('<100ms')).toBeInTheDocument();
    
    expect(screen.getByText('Memory Usage')).toBeInTheDocument();
    expect(screen.getByText('Optimized')).toBeInTheDocument();
    
    expect(screen.getByText('Concurrent Users')).toBeInTheDocument();
    expect(screen.getByText('100+')).toBeInTheDocument();
    
    expect(screen.getByText('Dataset Size')).toBeInTheDocument();
    expect(screen.getByText('10K+ entries')).toBeInTheDocument();
  });

  it('renders PerformanceDashboard component', () => {
    render(<PerformancePage />);
    
    expect(screen.getByTestId('performance-dashboard')).toBeInTheDocument();
  });

  it('renders performance optimization tips', () => {
    render(<PerformancePage />);
    
    expect(screen.getByText('Performance Optimization Tips')).toBeInTheDocument();
    expect(screen.getByText('Frontend Optimizations')).toBeInTheDocument();
    expect(screen.getByText('Backend Optimizations')).toBeInTheDocument();
    
    expect(screen.getByText(/Debounced search requests \(300ms\)/)).toBeInTheDocument();
    expect(screen.getByText(/In-memory Trie for O\(L\) search complexity/)).toBeInTheDocument();
  });

  it('has responsive grid layout for overview cards', () => {
    render(<PerformancePage />);
    
    const overviewGrid = screen.getByText('Avg Response Time').closest('.grid');
    expect(overviewGrid).toHaveClass('grid', 'grid-cols-1', 'sm:grid-cols-2', 'lg:grid-cols-4', 'gap-4');
  });

  it('has proper styling for performance cards', () => {
    render(<PerformancePage />);
    
    const responseTimeCard = screen.getByText('Avg Response Time').closest('.bg-white');
    expect(responseTimeCard).toHaveClass('bg-white', 'p-4', 'rounded-lg', 'shadow-sm', 'border');
  });

  it('includes SVG icons in performance cards', () => {
    render(<PerformancePage />);
    
    // Check for SVG elements (icons) in the performance cards
    const svgElements = document.querySelectorAll('svg');
    expect(svgElements.length).toBeGreaterThan(0);
  });

  it('has proper color coding for different metrics', () => {
    render(<PerformancePage />);
    
    const responseTimeIcon = screen.getByText('Avg Response Time').closest('.bg-white').querySelector('.bg-green-100');
    expect(responseTimeIcon).toBeInTheDocument();
    
    const memoryIcon = screen.getByText('Memory Usage').closest('.bg-white').querySelector('.bg-blue-100');
    expect(memoryIcon).toBeInTheDocument();
    
    const usersIcon = screen.getByText('Concurrent Users').closest('.bg-white').querySelector('.bg-purple-100');
    expect(usersIcon).toBeInTheDocument();
    
    const datasetIcon = screen.getByText('Dataset Size').closest('.bg-white').querySelector('.bg-yellow-100');
    expect(datasetIcon).toBeInTheDocument();
  });

  it('renders optimization tips in responsive grid', () => {
    render(<PerformancePage />);
    
    const tipsGrid = screen.getByText('Frontend Optimizations').closest('.grid');
    expect(tipsGrid).toHaveClass('grid', 'grid-cols-1', 'md:grid-cols-2', 'gap-6');
  });
});