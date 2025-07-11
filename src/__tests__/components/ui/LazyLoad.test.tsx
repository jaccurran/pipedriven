import React from 'react';
import { render, screen, waitFor, act, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { LazyLoad } from '@/components/ui/LazyLoad';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockDisconnect = vi.fn();
const mockObserve = vi.fn();
const mockUnobserve = vi.fn();

beforeEach(() => {
  mockIntersectionObserver.mockImplementation((callback) => ({
    disconnect: mockDisconnect,
    observe: mockObserve,
    unobserve: mockUnobserve,
  }));
  
  global.IntersectionObserver = mockIntersectionObserver;
});

afterEach(() => {
  vi.clearAllMocks();
  cleanup(); // Clean up DOM between tests
});

// Helper to trigger intersection observer callback
const triggerIntersection = (isIntersecting: boolean) => {
  const callback = mockIntersectionObserver.mock.calls[0][0];
  callback([
    {
      isIntersecting,
      target: document.createElement('div'),
      intersectionRatio: isIntersecting ? 1 : 0,
      boundingClientRect: {},
      rootBounds: {},
    },
  ]);
};

describe('LazyLoad', () => {
  const defaultProps = {
    children: <div>Lazy loaded content</div>,
    threshold: 0.1,
    rootMargin: '50px',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    cleanup(); // Ensure clean DOM for each test
  });

  describe('Rendering', () => {
    it('should render placeholder initially', () => {
      render(<LazyLoad {...defaultProps} />);
      
      expect(screen.getByTestId('lazy-load-placeholder')).toBeInTheDocument();
      expect(screen.queryByText('Lazy loaded content')).not.toBeInTheDocument();
    });

    it('should render custom placeholder', () => {
      const customPlaceholder = <div data-testid="custom-placeholder">Loading...</div>;
      render(<LazyLoad {...defaultProps} placeholder={customPlaceholder} />);
      
      expect(screen.getByTestId('custom-placeholder')).toBeInTheDocument();
      expect(screen.getByText('Loading...')).toBeInTheDocument();
    });

    it('should render children when visible', async () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('lazy-load-placeholder')).not.toBeInTheDocument();
    });

    it('should render complex children', async () => {
      const complexChildren = (
        <div>
          <h1>Title</h1>
          <p>Paragraph</p>
          <button>Click me</button>
        </div>
      );
      
      render(<LazyLoad {...defaultProps} children={complexChildren} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Title')).toBeInTheDocument();
        expect(screen.getByText('Paragraph')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Click me' })).toBeInTheDocument();
      });
    });
  });

  describe('Intersection Observer', () => {
    it('should create IntersectionObserver with correct options', () => {
      render(<LazyLoad {...defaultProps} />);
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        {
          threshold: 0.1,
          rootMargin: '50px',
        }
      );
    });

    it('should create IntersectionObserver with custom options', () => {
      render(
        <LazyLoad
          {...defaultProps}
          threshold={0.5}
          rootMargin="100px"
        />
      );
      
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        {
          threshold: 0.5,
          rootMargin: '100px',
        }
      );
    });

    it('should observe the placeholder element', () => {
      render(<LazyLoad {...defaultProps} />);
      
      expect(mockObserve).toHaveBeenCalledWith(
        expect.any(HTMLElement)
      );
    });

    it('should disconnect observer on unmount', () => {
      const { unmount } = render(<LazyLoad {...defaultProps} />);
      
      unmount();
      
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });

    it('should disconnect observer when visible', async () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(mockDisconnect).toHaveBeenCalled();
      });
    });
  });

  describe('Visibility States', () => {
    it('should show placeholder when not intersecting', () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Trigger intersection observer with false
      act(() => {
        triggerIntersection(false);
      });
      
      expect(screen.getByTestId('lazy-load-placeholder')).toBeInTheDocument();
      expect(screen.queryByText('Lazy loaded content')).not.toBeInTheDocument();
    });

    it('should show children when intersecting', async () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Trigger intersection observer with true
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      });
      
      expect(screen.queryByTestId('lazy-load-placeholder')).not.toBeInTheDocument();
    });

    it('should handle multiple intersection events', async () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Trigger intersection observer multiple times
      act(() => {
        triggerIntersection(false);
        triggerIntersection(true);
        triggerIntersection(false);
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      });
      
      // Should only show children once
      expect(screen.getAllByText('Lazy loaded content')).toHaveLength(1);
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for placeholder', () => {
      render(<LazyLoad {...defaultProps} />);
      
      const placeholder = screen.getByTestId('lazy-load-placeholder');
      expect(placeholder).toHaveClass(
        'flex',
        'items-center',
        'justify-center',
        'p-4',
        'text-gray-500'
      );
    });

    it('should have correct CSS classes for loading text', () => {
      render(<LazyLoad {...defaultProps} />);
      
      const loadingText = screen.getByText('Loading...');
      expect(loadingText).toHaveClass('text-gray-500');
    });

    it('should have correct CSS classes for custom placeholder', () => {
      const customPlaceholder = (
        <div className="custom-placeholder-class">
          Custom loading...
        </div>
      );
      
      render(<LazyLoad {...defaultProps} placeholder={customPlaceholder} />);
      
      const customPlaceholderElement = screen.getByText('Custom loading...');
      expect(customPlaceholderElement).toHaveClass('custom-placeholder-class');
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      expect(() => {
        render(<LazyLoad {...defaultProps} children={null} />);
      }).not.toThrow();
    });

    it('should handle undefined children', () => {
      expect(() => {
        render(<LazyLoad {...defaultProps} children={undefined} />);
      }).not.toThrow();
    });

    it('should handle empty children', () => {
      render(<LazyLoad {...defaultProps} children={<div></div>} />);
      
      expect(screen.getByTestId('lazy-load-placeholder')).toBeInTheDocument();
    });

    it('should handle very large children', () => {
      const largeContent = (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i}>Content item {i}</div>
          ))}
        </div>
      );
      
      render(<LazyLoad {...defaultProps} children={largeContent} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      expect(screen.getByText('Content item 0')).toBeInTheDocument();
      expect(screen.getByText('Content item 999')).toBeInTheDocument();
    });

    it('should handle rapid intersection changes', async () => {
      render(<LazyLoad {...defaultProps} />);
      
      // Rapidly trigger intersection changes
      for (let i = 0; i < 100; i++) {
        act(() => {
          triggerIntersection(i % 2 === 0);
        });
      }
      
      // Should eventually show content
      await waitFor(() => {
        expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      });
    });

    it('should handle IntersectionObserver not supported', () => {
      // Mock IntersectionObserver as undefined
      const originalIntersectionObserver = global.IntersectionObserver;
      global.IntersectionObserver = undefined as any;
      
      expect(() => {
        render(<LazyLoad {...defaultProps} />);
      }).not.toThrow();
      
      // Should show children immediately when IntersectionObserver is not supported
      expect(screen.getByText('Lazy loaded content')).toBeInTheDocument();
      
      // Restore original
      global.IntersectionObserver = originalIntersectionObserver;
    });
  });

  describe('Performance', () => {
    it('should not re-render unnecessarily', () => {
      const renderCount = vi.fn();
      const TestComponent = () => {
        renderCount();
        return <div>Test content</div>;
      };
      
      render(<LazyLoad {...defaultProps} children={<TestComponent />} />);
      
      // Should only render once initially
      expect(renderCount).toHaveBeenCalledTimes(0);
      
      // Trigger intersection
      act(() => {
        triggerIntersection(true);
      });
      
      // Should render once when visible
      expect(renderCount).toHaveBeenCalledTimes(1);
    });

    it('should handle multiple LazyLoad components efficiently', () => {
      const { rerender } = render(
        <div>
          <LazyLoad {...defaultProps} />
          <LazyLoad {...defaultProps} />
          <LazyLoad {...defaultProps} />
        </div>
      );
      
      // Should create multiple observers
      expect(mockIntersectionObserver).toHaveBeenCalledTimes(3);
      expect(mockObserve).toHaveBeenCalledTimes(3);
    });

    it('should clean up observers properly', () => {
      const { unmount } = render(<LazyLoad {...defaultProps} />);
      
      unmount();
      
      expect(mockDisconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe('Integration', () => {
    it('should work with images', async () => {
      const imageContent = (
        <img
          src="test-image.jpg"
          alt="Test image"
          data-testid="lazy-image"
        />
      );
      
      render(<LazyLoad {...defaultProps} children={imageContent} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-image')).toBeInTheDocument();
      });
      
      const image = screen.getByTestId('lazy-image');
      expect(image).toHaveAttribute('src', 'test-image.jpg');
      expect(image).toHaveAttribute('alt', 'Test image');
    });

    it('should work with iframes', async () => {
      const iframeContent = (
        <iframe
          src="https://example.com"
          title="Test iframe"
          data-testid="lazy-iframe"
        />
      );
      
      render(<LazyLoad {...defaultProps} children={iframeContent} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByTestId('lazy-iframe')).toBeInTheDocument();
      });
      
      const iframe = screen.getByTestId('lazy-iframe');
      expect(iframe).toHaveAttribute('src', 'https://example.com');
      expect(iframe).toHaveAttribute('title', 'Test iframe');
    });

    it('should work with dynamic content', async () => {
      const DynamicContent = ({ data }: { data: string[] }) => (
        <div>
          {data.map((item, index) => (
            <div key={index}>{item}</div>
          ))}
        </div>
      );
      
      const { rerender } = render(
        <LazyLoad {...defaultProps}>
          <DynamicContent data={['Item 1', 'Item 2']} />
        </LazyLoad>
      );
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByText('Item 1')).toBeInTheDocument();
        expect(screen.getByText('Item 2')).toBeInTheDocument();
      });
      
      // Update content
      rerender(
        <LazyLoad {...defaultProps}>
          <DynamicContent data={['Item 3', 'Item 4', 'Item 5']} />
        </LazyLoad>
      );
      
      expect(screen.getByText('Item 3')).toBeInTheDocument();
      expect(screen.getByText('Item 4')).toBeInTheDocument();
      expect(screen.getByText('Item 5')).toBeInTheDocument();
    });

    it('should work with React Router navigation', () => {
      // Mock router context
      const mockRouter = {
        push: vi.fn(),
        replace: vi.fn(),
      };
      
      const NavigationContent = () => (
        <div>
          <button onClick={() => mockRouter.push('/new-page')}>
            Navigate
          </button>
        </div>
      );
      
      render(
        <LazyLoad {...defaultProps}>
          <NavigationContent />
        </LazyLoad>
      );
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      const navigateButton = screen.getByRole('button', { name: 'Navigate' });
      expect(navigateButton).toBeInTheDocument();
    });

    it('should work with form elements', async () => {
      const formContent = (
        <form>
          <input type="text" placeholder="Name" />
          <button type="submit">Submit</button>
        </form>
      );
      
      render(<LazyLoad {...defaultProps} children={formContent} />);
      
      // Trigger intersection observer
      act(() => {
        triggerIntersection(true);
      });
      
      await waitFor(() => {
        expect(screen.getByPlaceholderText('Name')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit' })).toBeInTheDocument();
      });
    });
  });
}); 