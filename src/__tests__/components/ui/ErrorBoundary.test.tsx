import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ErrorBoundary } from '@/components/ui/ErrorBoundary';

// Mock console.error to avoid noise in tests
const originalError = console.error;
beforeEach(() => {
  console.error = vi.fn();
});

afterEach(() => {
  console.error = originalError;
  cleanup();
});

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Normal content</div>;
};

describe('ErrorBoundary', () => {
  const defaultProps = {
    children: <div>Normal content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render children when no error occurs', () => {
      render(<ErrorBoundary {...defaultProps} />);
      
      expect(screen.getByText('Normal content')).toBeInTheDocument();
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should render default error UI when error occurs', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Normal content')).not.toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div data-testid="custom-fallback">Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('Error Handling', () => {
    it('should catch JavaScript errors', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle errors in nested components', () => {
      const NestedComponent = () => (
        <div>
          <div>Outer content</div>
          <ThrowError shouldThrow={true} />
        </div>
      );
      
      render(
        <ErrorBoundary {...defaultProps}>
          <NestedComponent />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.queryByText('Outer content')).not.toBeInTheDocument();
    });
  });

  describe('Error Recovery', () => {
    it('should provide reset functionality', () => {
      const { rerender } = render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Reset the error by changing children
      rerender(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // The error boundary should still show the error until the component is unmounted and remounted
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should reset error state when resetKeys change', () => {
      const { rerender } = render(
        <ErrorBoundary {...defaultProps} resetKeys={[1]}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      
      // Change resetKeys to trigger reset
      rerender(
        <ErrorBoundary {...defaultProps} resetKeys={[2]}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      // The error boundary should reset and show normal content
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });

  describe('Interactions', () => {
    it('should handle Try Again button click', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      expect(tryAgainButton).toBeInTheDocument();
      
      fireEvent.click(tryAgainButton);
      
      // The error state should be reset, but the child will throw again
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });

    it('should handle Reload Page button click', () => {
      // Mock window.location.reload using a different approach
      const mockReload = vi.fn();
      const originalLocation = window.location;
      
      // Create a mock location object
      delete (window as any).location;
      window.location = {
        ...originalLocation,
        reload: mockReload,
      } as any;
      
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      expect(reloadButton).toBeInTheDocument();
      
      fireEvent.click(reloadButton);
      
      expect(mockReload).toHaveBeenCalled();
      
      // Restore original location
      window.location = originalLocation;
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for error container', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Get the main container div that has the min-h-screen class
      const container = screen.getByText('Something went wrong').closest('.min-h-screen');
      expect(container).toHaveClass('min-h-screen', 'flex', 'items-center', 'justify-center', 'bg-gray-50');
    });

    it('should have correct CSS classes for error message', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const errorMessage = screen.getByText('Something went wrong');
      expect(errorMessage).toHaveClass('text-3xl', 'font-extrabold', 'text-gray-900');
    });

    it('should have correct CSS classes for buttons', () => {
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      const tryAgainButton = screen.getByRole('button', { name: /try again/i });
      const reloadButton = screen.getByRole('button', { name: /reload page/i });
      
      expect(tryAgainButton).toHaveClass('w-full');
      expect(reloadButton).toHaveClass('w-full');
    });
  });

  describe('Edge Cases', () => {
    it('should handle onError callback', () => {
      const onError = vi.fn();
      
      render(
        <ErrorBoundary {...defaultProps} onError={onError}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(onError).toHaveBeenCalledWith(expect.any(Error), expect.any(Object));
    });

    it('should handle empty children', () => {
      render(<ErrorBoundary children={null} />);
      
      expect(screen.queryByText('Something went wrong')).not.toBeInTheDocument();
    });

    it('should handle rapid error/recovery cycles', () => {
      const { rerender } = render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      // Rapidly toggle between error and normal states
      rerender(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={false} />
        </ErrorBoundary>
      );
      
      rerender(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Development Mode', () => {
    it('should show error details in development mode', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      
      render(
        <ErrorBoundary {...defaultProps}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );
      
      expect(screen.getByText('Error Details (Development)')).toBeInTheDocument();
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = performance.now();
      render(<ErrorBoundary {...defaultProps} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should handle many re-renders efficiently', () => {
      const { rerender } = render(<ErrorBoundary {...defaultProps} />);
      
      for (let i = 0; i < 10; i++) {
        rerender(<ErrorBoundary {...defaultProps} />);
      }
      
      expect(screen.getByText('Normal content')).toBeInTheDocument();
    });
  });
}); 