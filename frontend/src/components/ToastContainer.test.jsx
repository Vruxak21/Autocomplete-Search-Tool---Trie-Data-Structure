import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { vi } from 'vitest';
import { ToastProvider, useToast } from './ToastContainer';

// Test component that uses the toast context
const TestComponent = () => {
  const { showSuccess, showError, showWarning, showInfo, clearAll } = useToast();

  return (
    <div>
      <button onClick={() => showSuccess('Success message')}>Show Success</button>
      <button onClick={() => showError('Error message')}>Show Error</button>
      <button onClick={() => showWarning('Warning message')}>Show Warning</button>
      <button onClick={() => showInfo('Info message')}>Show Info</button>
      <button onClick={clearAll}>Clear All</button>
    </div>
  );
};

describe('ToastContainer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('throws error when useToast is used outside provider', () => {
    // Suppress console.error for this test
    const originalError = console.error;
    console.error = vi.fn();

    expect(() => {
      render(<TestComponent />);
    }).toThrow('useToast must be used within a ToastProvider');

    console.error = originalError;
  });

  it('provides toast context to children', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    expect(screen.getByText('Show Success')).toBeInTheDocument();
    expect(screen.getByText('Show Error')).toBeInTheDocument();
    expect(screen.getByText('Show Warning')).toBeInTheDocument();
    expect(screen.getByText('Show Info')).toBeInTheDocument();
  });

  it('shows success toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();
  });

  it('shows error toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Error'));
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('shows warning toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Warning'));
    expect(screen.getByText('Warning message')).toBeInTheDocument();
  });

  it('shows info toast', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Info'));
    expect(screen.getByText('Info message')).toBeInTheDocument();
  });

  it('shows multiple toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();
  });

  it('clears all toasts', () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    fireEvent.click(screen.getByText('Show Error'));

    expect(screen.getByText('Success message')).toBeInTheDocument();
    expect(screen.getByText('Error message')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Clear All'));

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
    expect(screen.queryByText('Error message')).not.toBeInTheDocument();
  });

  it('removes toast after duration', async () => {
    render(
      <ToastProvider>
        <TestComponent />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    expect(screen.getByText('Success message')).toBeInTheDocument();

    // Fast-forward time to trigger auto-close
    act(() => {
      vi.advanceTimersByTime(5000);
    });

    // Wait for animation and removal
    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(screen.queryByText('Success message')).not.toBeInTheDocument();
  });

  it('returns toast ID when adding toast', () => {
    const TestComponentWithId = () => {
      const { showSuccess } = useToast();
      const [toastId, setToastId] = React.useState(null);

      return (
        <div>
          <button onClick={() => {
            const id = showSuccess('Success message');
            setToastId(id);
          }}>
            Show Success
          </button>
          {toastId && <div data-testid="toast-id">{toastId}</div>}
        </div>
      );
    };

    render(
      <ToastProvider>
        <TestComponentWithId />
      </ToastProvider>
    );

    fireEvent.click(screen.getByText('Show Success'));
    
    const toastIdElement = screen.getByTestId('toast-id');
    expect(toastIdElement).toBeInTheDocument();
    expect(toastIdElement.textContent).toBeTruthy();
  });
});