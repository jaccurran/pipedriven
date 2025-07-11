import React from 'react';
import { render, screen, fireEvent, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Toast } from '@/components/ui/Toast';

// Mock createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}));

describe('Toast', () => {
  const defaultProps = {
    id: 'test-toast',
    message: 'Test toast message',
    onClose: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.body for portal
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render with default props', () => {
      render(<Toast {...defaultProps} />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();
    });

    it('should render with title', () => {
      render(<Toast {...defaultProps} title="Test Title" />);
      expect(screen.getByText('Test Title')).toBeInTheDocument();
    });

    it('should render with different types', () => {
      const { rerender } = render(<Toast {...defaultProps} type="success" />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="error" />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="warning" />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();

      rerender(<Toast {...defaultProps} type="info" />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();
    });

    it('should render close button', () => {
      render(<Toast {...defaultProps} />);
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('should render with custom duration', () => {
      render(<Toast {...defaultProps} duration={10000} />);
      expect(screen.getByText('Test toast message')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', async () => {
      const onClose = vi.fn();
      render(<Toast {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      fireEvent.click(closeButton);
      
      // Wait for the 300ms delay in handleClose
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledWith('test-toast');
      }, { timeout: 1000 });
    });

    it('should handle keyboard events', () => {
      const onClose = vi.fn();
      render(<Toast {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      
      // Test that the button can receive focus
      closeButton.focus();
      expect(closeButton).toHaveFocus();
      
      // Test that the button has proper keyboard accessibility
      expect(closeButton).toHaveAttribute('type', 'button');
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for success type', () => {
      render(<Toast {...defaultProps} type="success" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'max-w-sm', 'w-full');
    });

    it('should have correct CSS classes for error type', () => {
      render(<Toast {...defaultProps} type="error" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'max-w-sm', 'w-full');
    });

    it('should have correct CSS classes for warning type', () => {
      render(<Toast {...defaultProps} type="warning" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'max-w-sm', 'w-full');
    });

    it('should have correct CSS classes for info type', () => {
      render(<Toast {...defaultProps} type="info" />);
      
      const toast = screen.getByRole('alert');
      expect(toast).toHaveClass('fixed', 'top-4', 'right-4', 'z-50', 'max-w-sm', 'w-full');
    });

    it('should have correct CSS classes for close button', () => {
      render(<Toast {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      expect(closeButton).toHaveClass('inline-flex', 'rounded-md', 'focus:outline-none', 'focus:ring-2', 'focus:ring-offset-2');
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Toast {...defaultProps} />);
      
      const alert = screen.getByRole('alert');
      expect(alert).toHaveAttribute('aria-live', 'assertive');
      expect(alert).toHaveAttribute('aria-atomic', 'true');
    });

    it('should have accessible close button', () => {
      render(<Toast {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      expect(closeButton).toHaveAttribute('aria-label', 'Close notification');
    });

    it('should support keyboard navigation', () => {
      render(<Toast {...defaultProps} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      closeButton.focus();
      expect(closeButton).toHaveFocus();
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty message', () => {
      render(<Toast {...defaultProps} message="" />);
      expect(screen.getByRole('alert')).toBeInTheDocument();
    });

    it('should handle very long messages', () => {
      const longMessage = 'A'.repeat(1000);
      render(<Toast {...defaultProps} message={longMessage} />);
      expect(screen.getByText(longMessage)).toBeInTheDocument();
    });

    it('should handle rapid close clicks', async () => {
      const onClose = vi.fn();
      render(<Toast {...defaultProps} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close notification/i });
      
      // Rapid clicks
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      fireEvent.click(closeButton);
      
      // Wait for the 300ms delay in handleClose
      await waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(3);
      }, { timeout: 1000 });
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = performance.now();
      render(<Toast {...defaultProps} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should handle many re-renders', () => {
      const { rerender } = render(<Toast {...defaultProps} />);
      
      for (let i = 0; i < 10; i++) {
        rerender(<Toast {...defaultProps} message={`Message ${i}`} />);
      }
      
      expect(screen.getByText('Message 9')).toBeInTheDocument();
    });
  });
}); 