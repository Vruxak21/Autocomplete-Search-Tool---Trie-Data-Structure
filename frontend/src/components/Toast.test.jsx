import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import Toast from './Toast';

describe('Toast', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('renders toast message', () => {
    render(<Toast message="Test message" />);
    expect(screen.getByText('Test message')).toBeInTheDocument();
  });

  it('renders different toast types with correct styling', () => {
    const { rerender, container } = render(<Toast message="Success" type="success" />);
    expect(container.querySelector('.border-green-500')).toBeInTheDocument();

    rerender(<Toast message="Error" type="error" />);
    expect(container.querySelector('.border-red-500')).toBeInTheDocument();

    rerender(<Toast message="Warning" type="warning" />);
    expect(container.querySelector('.border-yellow-500')).toBeInTheDocument();

    rerender(<Toast message="Info" type="info" />);
    expect(container.querySelector('.border-blue-500')).toBeInTheDocument();
  });

  it('auto-closes after specified duration', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" duration={1000} onClose={onClose} />);

    expect(screen.getByText('Test')).toBeInTheDocument();

    // Fast-forward time for the initial timer
    vi.advanceTimersByTime(1000);
    
    // Fast-forward time for the animation timer
    vi.advanceTimersByTime(300);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when close button is clicked', async () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // Wait for animation
    vi.advanceTimersByTime(300);

    await waitFor(() => {
      expect(onClose).toHaveBeenCalledTimes(1);
    });
  });

  it('shows correct icon for each type', () => {
    const { rerender, container } = render(<Toast message="Success" type="success" />);
    expect(container.querySelector('svg.text-green-500')).toBeInTheDocument();

    rerender(<Toast message="Error" type="error" />);
    expect(container.querySelector('svg.text-red-500')).toBeInTheDocument();

    rerender(<Toast message="Warning" type="warning" />);
    expect(container.querySelector('svg.text-yellow-500')).toBeInTheDocument();

    rerender(<Toast message="Info" type="info" />);
    expect(container.querySelector('svg.text-blue-500')).toBeInTheDocument();
  });

  it('applies exit animation when closing', () => {
    const onClose = vi.fn();
    render(<Toast message="Test" onClose={onClose} />);

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    // Check that exit animation class is applied
    expect(screen.getByText('Test').closest('.translate-x-full')).toBeInTheDocument();
  });
});