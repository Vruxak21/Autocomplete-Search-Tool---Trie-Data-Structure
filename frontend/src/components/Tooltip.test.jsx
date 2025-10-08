import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi } from 'vitest';
import Tooltip from './Tooltip.jsx';

// Mock createPortal for testing
vi.mock('react-dom', () => ({
  ...vi.importActual('react-dom'),
  createPortal: (element) => element,
}));

describe('Tooltip Component', () => {
  const defaultProps = {
    content: 'Test tooltip content',
    children: <button>Trigger</button>
  };

  beforeEach(() => {
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  describe('Basic Functionality', () => {
    it('renders trigger element correctly', () => {
      render(<Tooltip {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Trigger' })).toBeInTheDocument();
    });

    it('shows tooltip on hover after delay', async () => {
      render(<Tooltip {...defaultProps} delay={100} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      // Tooltip should not be visible immediately
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      
      // Fast-forward time
      act(() => {
        vi.advanceTimersByTime(100);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });

    it('hides tooltip on mouse leave', async () => {
      render(<Tooltip {...defaultProps} delay={0} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      fireEvent.mouseLeave(trigger);
      
      await waitFor(() => {
        expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
      });
    });

    it('shows tooltip on focus', async () => {
      render(<Tooltip {...defaultProps} delay={0} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.focus(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
    });
  });

  describe('Content Types', () => {
    it('renders string content correctly', async () => {
      render(<Tooltip content="Simple text" delay={0}>{defaultProps.children}</Tooltip>);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Simple text')).toBeInTheDocument();
      });
    });

    it('renders object content with metadata', async () => {
      const objectContent = {
        title: 'Node Information',
        items: [
          { label: 'Frequency', value: '42' },
          { label: 'Type', value: 'Word' }
        ],
        description: 'This is a test node'
      };
      
      render(<Tooltip content={objectContent} delay={0}>{defaultProps.children}</Tooltip>);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Node Information')).toBeInTheDocument();
        expect(screen.getByText('Frequency:')).toBeInTheDocument();
        expect(screen.getByText('42')).toBeInTheDocument();
        expect(screen.getByText('Type:')).toBeInTheDocument();
        expect(screen.getByText('Word')).toBeInTheDocument();
        expect(screen.getByText('This is a test node')).toBeInTheDocument();
      });
    });
  });

  describe('Disabled State', () => {
    it('does not show tooltip when disabled', async () => {
      render(<Tooltip {...defaultProps} disabled={true} delay={0} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('does not show tooltip when content is empty', async () => {
      render(<Tooltip content="" delay={0}>{defaultProps.children}</Tooltip>);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });

  describe('Callbacks', () => {
    it('calls onShow callback when tooltip appears', async () => {
      const onShow = vi.fn();
      render(<Tooltip {...defaultProps} onShow={onShow} delay={0} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(onShow).toHaveBeenCalledTimes(1);
      });
    });

    it('calls onHide callback when tooltip disappears', async () => {
      const onHide = vi.fn();
      render(<Tooltip {...defaultProps} onHide={onHide} delay={0} />);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      await waitFor(() => {
        expect(screen.getByRole('tooltip')).toBeInTheDocument();
      });
      
      fireEvent.mouseLeave(trigger);
      
      await waitFor(() => {
        expect(onHide).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('Edge Cases', () => {
    it('handles null content gracefully', () => {
      render(<Tooltip content={null} delay={0}>{defaultProps.children}</Tooltip>);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });

    it('handles undefined content gracefully', () => {
      render(<Tooltip content={undefined} delay={0}>{defaultProps.children}</Tooltip>);
      
      const trigger = screen.getByRole('button');
      fireEvent.mouseEnter(trigger);
      
      act(() => {
        vi.advanceTimersByTime(0);
      });
      
      expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
    });
  });
});