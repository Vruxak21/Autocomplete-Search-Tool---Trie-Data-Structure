/**
 * @fileoverview Tests for TreeErrorBoundary component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TreeErrorBoundary from './TreeErrorBoundary';
import { VIEW_MODES, ERROR_TYPES, FALLBACK_ACTIONS } from '../types/tree';

// Component that throws an error for testing
const ThrowError = ({ shouldThrow = false, errorMessage = 'Test error' }) => {
  if (shouldThrow) {
    throw new Error(errorMessage);
  }
  return <div data-testid="success-component">Success</div>;
};

describe('TreeErrorBoundary', () => {
  const mockOnError = vi.fn();
  const mockOnRetry = vi.fn();
  const mockOnFallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for error boundary tests
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    console.error.mockRestore();
  });

  it('renders children when no error occurs', () => {
    render(
      <TreeErrorBoundary>
        <ThrowError shouldThrow={false} />
      </TreeErrorBoundary>
    );

    expect(screen.getByTestId('success-component')).toBeInTheDocument();
  });

  it('catches errors and displays error UI', () => {
    render(
      <TreeErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </TreeErrorBoundary>
    );

    expect(screen.getByText('Tree View Error')).toBeInTheDocument();
    expect(screen.getByText(/Something went wrong while displaying the tree view/)).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
    expect(screen.getByTestId('fallback-button')).toBeInTheDocument();
  });

  it('calls onError callback with proper error object', () => {
    render(
      <TreeErrorBoundary onError={mockOnError}>
        <ThrowError shouldThrow={true} errorMessage="Test error message" />
      </TreeErrorBoundary>
    );

    expect(mockOnError).toHaveBeenCalledWith({
      type: ERROR_TYPES.RENDER_ERROR,
      message: 'Test error message',
      fallbackAction: FALLBACK_ACTIONS.USE_LIST_VIEW,
      originalError: expect.any(Error)
    });
  });

  it('displays custom user-friendly message', () => {
    const customMessage = 'Custom error message for users';
    
    render(
      <TreeErrorBoundary userFriendlyMessage={customMessage}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    expect(screen.getByText(customMessage)).toBeInTheDocument();
  });

  it('shows error details when showErrorDetails is true', () => {
    render(
      <TreeErrorBoundary showErrorDetails={true}>
        <ThrowError shouldThrow={true} errorMessage="Detailed error" />
      </TreeErrorBoundary>
    );

    expect(screen.getByText('Technical Details')).toBeInTheDocument();
    expect(screen.getByText('Error:')).toBeInTheDocument();
    expect(screen.getByText('Detailed error')).toBeInTheDocument();
  });

  it('hides error details when showErrorDetails is false', () => {
    render(
      <TreeErrorBoundary showErrorDetails={false}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
  });

  it('handles retry functionality', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary onRetry={mockOnRetry} maxRetries={2}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toHaveTextContent('Try Again');

    await user.click(retryButton);

    expect(mockOnRetry).toHaveBeenCalledWith(1);
  });

  it('shows retry count in button text', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary maxRetries={3}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // First retry
    await user.click(screen.getByTestId('retry-button'));
    expect(screen.getByTestId('retry-button')).toHaveTextContent('Try Again (1/3)');
  });

  it('disables retry button after max retries', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary maxRetries={1} onFallback={mockOnFallback}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Use up the retry
    await user.click(screen.getByTestId('retry-button'));
    
    // After max retries, retry button should not be available
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
    
    // Only fallback button should be available
    expect(screen.getByTestId('fallback-button')).toBeInTheDocument();
  });

  it('shows max retry message when retries exhausted', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary maxRetries={1}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Use up the retry
    await user.click(screen.getByTestId('retry-button'));
    
    // After max retries, should show the message
    expect(screen.getByText('Maximum retry attempts reached. Please use list view.')).toBeInTheDocument();
    
    // Retry button should not be available
    expect(screen.queryByTestId('retry-button')).not.toBeInTheDocument();
  });

  it('handles fallback button click', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary onFallback={mockOnFallback}>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    await user.click(screen.getByTestId('fallback-button'));

    expect(mockOnFallback).toHaveBeenCalledWith(VIEW_MODES.LIST);
  });

  it('resets error state on successful retry', async () => {
    const user = userEvent.setup();
    
    const TestComponent = ({ shouldThrow }) => {
      if (shouldThrow) {
        throw new Error('Test error');
      }
      return <div data-testid="success-component">Success</div>;
    };
    
    const { rerender } = render(
      <TreeErrorBoundary>
        <TestComponent shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Error should be displayed
    expect(screen.getByText('Tree View Error')).toBeInTheDocument();

    // Click retry - this resets the error boundary state
    await user.click(screen.getByTestId('retry-button'));
    
    // Rerender with non-throwing component
    rerender(
      <TreeErrorBoundary>
        <TestComponent shouldThrow={false} />
      </TreeErrorBoundary>
    );

    // Success component should be displayed
    expect(screen.getByTestId('success-component')).toBeInTheDocument();
    expect(screen.queryByText('Tree View Error')).not.toBeInTheDocument();
  });

  it('uses default props correctly', () => {
    render(
      <TreeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Should show default message
    expect(screen.getByText(/Something went wrong while displaying the tree view/)).toBeInTheDocument();
    
    // Should not show error details by default
    expect(screen.queryByText('Technical Details')).not.toBeInTheDocument();
    
    // Should have retry button with default max retries
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });

  it('handles missing callback props gracefully', async () => {
    const user = userEvent.setup();
    
    render(
      <TreeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Should not throw errors when clicking buttons without callbacks
    await user.click(screen.getByTestId('retry-button'));
    await user.click(screen.getByTestId('fallback-button'));
    
    // Test passes if no errors are thrown
  });

  it('applies proper CSS classes and accessibility attributes', () => {
    render(
      <TreeErrorBoundary>
        <ThrowError shouldThrow={true} />
      </TreeErrorBoundary>
    );

    // Find the main error container
    const errorContainer = screen.getByText('Tree View Error').closest('.tree-error-boundary');
    expect(errorContainer).toHaveClass('tree-error-boundary', 'p-4', 'text-center', 'border-t', 'border-gray-200');

    const retryButton = screen.getByTestId('retry-button');
    expect(retryButton).toHaveClass('px-3', 'py-1.5', 'text-sm', 'bg-blue-600', 'text-white', 'rounded');
    expect(retryButton).toHaveAttribute('type', 'button');

    const fallbackButton = screen.getByTestId('fallback-button');
    expect(fallbackButton).toHaveClass('px-3', 'py-1.5', 'text-sm', 'bg-gray-600', 'text-white', 'rounded');
    expect(fallbackButton).toHaveAttribute('type', 'button');
  });
});