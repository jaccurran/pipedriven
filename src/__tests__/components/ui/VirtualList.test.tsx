import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { VirtualList } from '@/components/ui/VirtualList'

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

describe('VirtualList', () => {
  const defaultProps = {
    items: Array.from({ length: 100 }, (_, i) => ({
      id: i,
      title: `Item ${i}`,
      description: `Description for item ${i}`,
    })),
    containerHeight: 400,
    itemHeight: 60,
    renderItem: (item: any) => (
      <div data-testid={`item-${item.id}`}>
        <h3>{item.title}</h3>
        <p>{item.description}</p>
      </div>
    ),
  }

  beforeEach(() => {
    // Clear any previous renders
    document.body.innerHTML = ''
  })

  afterEach(() => {
    // Clean up after each test
    document.body.innerHTML = ''
  })

  describe('Rendering', () => {
    it('should render visible items only', () => {
      render(<VirtualList {...defaultProps} />);
      
      // Should render approximately 7 items (400px container / 60px item height)
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThanOrEqual(15);
      expect(visibleItems.length).toBeGreaterThan(0);
    });

    it('should render first few items initially', () => {
      render(<VirtualList {...defaultProps} />);
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
    });

    it('should render items with correct content', () => {
      render(<VirtualList {...defaultProps} />);
      
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Description for item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 1')).toBeInTheDocument();
      expect(screen.getByText('Description for item 1')).toBeInTheDocument();
    });

    it('should render with custom item renderer', () => {
      const customRenderItem = (item: any) => (
        <div data-testid={`custom-item-${item.id}`} className="custom-item">
          <span className="item-name">{item.title}</span>
          <span className="item-desc">{item.description}</span>
        </div>
      );
      
      render(<VirtualList {...defaultProps} renderItem={customRenderItem} />);
      
      expect(screen.getByTestId('custom-item-0')).toBeInTheDocument();
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Description for item 0')).toBeInTheDocument();
    });

    it('should render with empty items array', () => {
      render(<VirtualList {...defaultProps} items={[]} />);
      
      expect(screen.queryByTestId(/^item-/)).not.toBeInTheDocument();
    });

    it('should render with single item', () => {
      render(<VirtualList {...defaultProps} items={[{ id: 0, title: 'Single Item', description: 'Single description' }]} />);
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByText('Single Item')).toBeInTheDocument();
    });
  });

  describe('Scrolling', () => {
    it('should render different items when scrolled', () => {
      render(<VirtualList {...defaultProps} />);
      
      // Initially should show first few items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-50')).not.toBeInTheDocument();
      
      // Simulate scroll to middle
      const container = screen.getByTestId('virtual-list-container');
      fireEvent.scroll(container, { target: { scrollTop: 3000 } });
      
      // Should now show items around position 50 (3000px / 60px per item)
      expect(screen.getByTestId('item-50')).toBeInTheDocument();
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
    });

    it('should handle scroll to bottom', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByTestId('virtual-list-container');
      fireEvent.scroll(container, { target: { scrollTop: 6000 } }); // Scroll to near bottom
      
      // Should show items near the end
      expect(screen.getByTestId('item-95')).toBeInTheDocument();
      expect(screen.getByTestId('item-99')).toBeInTheDocument();
    });

    it('should handle scroll to top', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByTestId('virtual-list-container');
      
      // First scroll down
      fireEvent.scroll(container, { target: { scrollTop: 3000 } });
      
      expect(screen.getByTestId('item-50')).toBeInTheDocument();
      
      // Then scroll back to top
      fireEvent.scroll(container, { target: { scrollTop: 0 } });
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-50')).not.toBeInTheDocument();
    });

    it('should maintain scroll position during re-renders', () => {
      const { rerender } = render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByTestId('virtual-list-container');
      
      // Scroll to middle
      fireEvent.scroll(container, { target: { scrollTop: 3000 } });
      
      expect(screen.getByTestId('item-50')).toBeInTheDocument();
      
      // Re-render with same props
      rerender(<VirtualList {...defaultProps} />);
      
      // Should still show the same items
      expect(screen.getByTestId('item-50')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render only visible items', () => {
      const renderCount = vi.fn();
      const renderItemWithCount = (item: any) => {
        renderCount();
        return (
          <div data-testid={`item-${item.id}`}>
            {item.title}
          </div>
        );
      };
      
      render(<VirtualList {...defaultProps} renderItem={renderItemWithCount} />);
      
      // Should only render visible items (around 7-15 items)
      const count = renderCount.mock.calls.length;
      expect(count).toBeGreaterThanOrEqual(5);
      expect(count).toBeLessThanOrEqual(20);
    });

    it('should handle large datasets efficiently', () => {
      const largeItems = Array.from({ length: 100000 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        description: `Description for item ${i}`,
      }));
      
      const startTime = performance.now();
      render(<VirtualList {...defaultProps} items={largeItems} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (less than 100ms)
      expect(endTime - startTime).toBeLessThan(100);
      
      // Should still only render visible items
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThan(20);
    });

    it('should not re-render items unnecessarily', () => {
      const renderCount = vi.fn();
      const renderItemWithCount = (item: any) => {
        renderCount();
        return (
          <div data-testid={`item-${item.id}`}>
            {item.title}
          </div>
        );
      };
      
      const { rerender } = render(<VirtualList {...defaultProps} renderItem={renderItemWithCount} />);
      
      const initialRenderCount = renderCount.mock.calls.length;
      
      // Re-render with same props
      rerender(<VirtualList {...defaultProps} renderItem={renderItemWithCount} />);
      
      // Should not re-render items unnecessarily (allow for React 18 double render)
      const totalCount = renderCount.mock.calls.length;
      expect(totalCount).toBeGreaterThanOrEqual(initialRenderCount);
      expect(totalCount).toBeLessThanOrEqual(initialRenderCount * 2);
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for container', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByTestId('virtual-list-container');
      expect(container).toHaveClass('overflow-auto');
    });

    it('should have correct CSS classes for content wrapper', () => {
      render(<VirtualList {...defaultProps} />);
      
      const contentWrapper = screen.getByTestId('virtual-list-content');
      expect(contentWrapper).toHaveStyle({ position: 'relative' });
    });

    it('should have correct height for content wrapper', () => {
      render(<VirtualList {...defaultProps} />);
      
      const contentWrapper = screen.getByTestId('virtual-list-content');
      expect(contentWrapper).toHaveStyle({ height: '6000px' }); // 100 items * 60px
    });

    it('should have correct container height', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByTestId('virtual-list-container');
      expect(container).toHaveStyle({ height: '400px' });
    });

    it('should have correct item positioning', () => {
      render(<VirtualList {...defaultProps} />);
      
      const itemsWrapper = screen.getByTestId('virtual-list-items-wrapper');
      expect(itemsWrapper).toHaveStyle({ position: 'absolute', top: '0px' });
      
      const firstItem = screen.getByTestId('item-0');
      expect(firstItem).toBeInTheDocument();
      
      const secondItem = screen.getByTestId('item-1');
      expect(secondItem).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with varying heights', () => {
      const variableHeightItems = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        height: i % 2 === 0 ? 60 : 120, // Alternating heights
      }));
      
      const renderVariableHeightItem = (item: any) => (
        <div 
          data-testid={`item-${item.id}`}
          style={{ height: `${item.height}px` }}
        >
          {item.name}
        </div>
      );
      
      render(
        <VirtualList
          {...defaultProps}
          items={variableHeightItems}
          renderItem={renderVariableHeightItem}
          itemHeight={90} // Average height
        />
      );
      
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
    });

    it('should handle very small item heights', () => {
      render(<VirtualList {...defaultProps} itemHeight={10} />);
      
      // Should render more items with smaller height
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeGreaterThan(10);
    });

    it('should handle very large item heights', () => {
      render(<VirtualList {...defaultProps} itemHeight={200} />);
      
      // Should render fewer items with larger height
      const visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThan(10);
    });

    it('should handle container height changes', () => {
      const { rerender } = render(<VirtualList {...defaultProps} />);
      
      // Initial render
      let visibleItems = screen.getAllByTestId(/^item-/);
      const initialCount = visibleItems.length;
      
      // Change container height
      rerender(<VirtualList {...defaultProps} containerHeight={200} />);
      
      // Should render fewer items with smaller container
      visibleItems = screen.getAllByTestId(/^item-/);
      expect(visibleItems.length).toBeLessThan(initialCount);
    });

    it('should handle items with special characters', () => {
      const specialItems = [
        { id: 0, title: 'Item & Name', description: 'Description with <script>alert("xss")</script>' },
        { id: 1, title: 'Item with "quotes"', description: 'Description with \'single quotes\'' },
      ];
      
      render(<VirtualList {...defaultProps} items={specialItems} />);
      
      expect(screen.getByText('Item & Name')).toBeInTheDocument();
      expect(screen.getByText('Description with <script>alert("xss")</script>')).toBeInTheDocument();
      expect(screen.getByText('Item with "quotes"')).toBeInTheDocument();
      expect(screen.getByText('Description with \'single quotes\'')).toBeInTheDocument();
    });

    it('should handle items with null/undefined values', () => {
      const itemsWithNulls = [
        { id: 0, title: null, description: undefined },
        { id: 1, title: 'Valid item', description: 'Valid description' },
      ];
      
      expect(() => {
        render(<VirtualList {...defaultProps} items={itemsWithNulls} />);
      }).not.toThrow();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByRole('listbox');
      expect(container).toHaveAttribute('role', 'listbox');
      expect(container).toHaveAttribute('aria-label', 'Virtual list');
    });

    it('should have proper item roles', () => {
      render(<VirtualList {...defaultProps} />);
      
      const items = screen.getAllByRole('option');
      expect(items.length).toBeGreaterThan(0);
      items.forEach(item => {
        expect(item).toHaveAttribute('role', 'option');
      });
    });

    it('should support keyboard navigation', () => {
      render(<VirtualList {...defaultProps} />);
      
      const container = screen.getByRole('listbox');
      
      // Focus the container
      container.focus();
      expect(container).toHaveFocus();
      
      // Arrow down should scroll down
      fireEvent.keyDown(container, { key: 'ArrowDown' });
      
      // Arrow up should scroll up
      fireEvent.keyDown(container, { key: 'ArrowUp' });
      
      // Page down should scroll down more
      fireEvent.keyDown(container, { key: 'PageDown' });
      
      // Page up should scroll up more
      fireEvent.keyDown(container, { key: 'PageUp' });
    });
  });

  describe('Integration', () => {
    it('should work with form elements inside items', () => {
      const itemsWithForms = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        title: `Item ${i}`,
        description: `Description ${i}`,
      }));
      
      const renderItemWithForm = (item: any) => (
        <div data-testid={`item-${item.id}`}>
          <h3>{item.title}</h3>
          <p>{item.description}</p>
          <input type="checkbox" data-testid={`checkbox-${item.id}`} />
          <button data-testid={`button-${item.id}`}>Action</button>
        </div>
      );
      
      render(<VirtualList {...defaultProps} items={itemsWithForms} renderItem={renderItemWithForm} />);
      
      expect(screen.getByTestId('checkbox-0')).toBeInTheDocument();
      expect(screen.getByTestId('button-0')).toBeInTheDocument();
      
      // Should be able to interact with form elements
      const checkbox = screen.getByTestId('checkbox-0');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });

    it('should work with dynamic item updates', () => {
      const { rerender } = render(<VirtualList {...defaultProps} />);
      
      // Initially show first items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      
      // Update items
      const updatedItems = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        title: `Updated Item ${i}`,
        description: `Updated description ${i}`,
      }));
      
      rerender(<VirtualList {...defaultProps} items={updatedItems} />);
      
      expect(screen.getByText('Updated Item 0')).toBeInTheDocument();
      expect(screen.getByText('Updated description 0')).toBeInTheDocument();
    });

    it('should work with React Router navigation', () => {
      const mockRouter = {
        push: vi.fn(),
        replace: vi.fn(),
      };
      
      const renderItemWithNavigation = (item: any) => (
        <div data-testid={`item-${item.id}`}>
          <h3>{item.title}</h3>
          <button data-testid={`nav-button-${item.id}`} onClick={() => mockRouter.push(`/item/${item.id}`)}>
            View Details
          </button>
        </div>
      );
      
      render(<VirtualList {...defaultProps} renderItem={renderItemWithNavigation} />);
      
      const viewButton = screen.getByTestId('nav-button-0');
      fireEvent.click(viewButton);
      
      expect(mockRouter.push).toHaveBeenCalledWith('/item/0');
    });

    it('should work with search/filter functionality', () => {
      const { rerender } = render(<VirtualList {...defaultProps} />);
      
      // Initially show all items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.getByTestId('item-1')).toBeInTheDocument();
      
      // Filter items
      const filteredItems = defaultProps.items.filter(item => item.id % 2 === 0);
      rerender(<VirtualList {...defaultProps} items={filteredItems} />);
      
      // Should show only even-numbered items
      expect(screen.getByTestId('item-0')).toBeInTheDocument();
      expect(screen.queryByTestId('item-1')).not.toBeInTheDocument();
      expect(screen.getByTestId('item-2')).toBeInTheDocument();
    });
  });
}); 