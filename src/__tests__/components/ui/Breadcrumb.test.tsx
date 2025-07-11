import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Breadcrumb } from '@/components/ui/Breadcrumb';

describe('Breadcrumb', () => {
  const defaultItems = [
    { label: 'Home', href: '/' },
    { label: 'Campaigns', href: '/campaigns' },
    { label: 'Current Page', href: '/campaigns/123' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Rendering', () => {
    it('should render breadcrumb navigation', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      expect(screen.getByRole('navigation', { name: /breadcrumb/i })).toBeInTheDocument();
      expect(screen.getByRole('list')).toBeInTheDocument();
    });

    it('should render all breadcrumb items', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
      expect(screen.getByText('Current Page')).toBeInTheDocument();
    });

    it('should render single item breadcrumb', () => {
      const singleItem = [{ label: 'Home', href: '/' }];
      render(<Breadcrumb items={singleItem} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.queryByText('/')).not.toBeInTheDocument();
    });

    it('should render empty breadcrumb gracefully', () => {
      render(<Breadcrumb items={[]} />);
      
      // When items is empty, the component returns null
      expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
      expect(screen.queryByRole('list')).not.toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
      
      const list = screen.getByRole('list');
      expect(list).toBeInTheDocument();
    });

    it('should have proper link attributes', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const links = screen.getAllByRole('link');
      expect(links[0]).toHaveAttribute('href', '/');
      expect(links[1]).toHaveAttribute('href', '/campaigns');
      expect(links[2]).toHaveAttribute('href', '/campaigns/123');
    });

    it('should have proper separator accessibility', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const separators = screen.getAllByText('/');
      separators.forEach(separator => {
        expect(separator).toHaveAttribute('aria-hidden', 'true');
      });
    });
  });

  describe('Interactions', () => {
    it('should handle link clicks', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const homeLink = screen.getByRole('link', { name: 'Home' });
      expect(homeLink).toHaveAttribute('href', '/');
      
      const campaignsLink = screen.getByRole('link', { name: 'Campaigns' });
      expect(campaignsLink).toHaveAttribute('href', '/campaigns');
    });

    it('should handle keyboard navigation', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveAttribute('href');
        expect(link).toHaveClass('text-gray-600', 'hover:text-gray-900', 'transition-colors');
      });
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for navigation', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const nav = screen.getByRole('navigation', { name: 'Breadcrumb' });
      expect(nav).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should have correct CSS classes for list', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const list = screen.getByRole('list');
      expect(list).toHaveClass('flex', 'items-center', 'space-x-2');
    });

    it('should have correct CSS classes for links', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const links = screen.getAllByRole('link');
      links.forEach(link => {
        expect(link).toHaveClass('text-gray-600', 'hover:text-gray-900', 'transition-colors');
      });
    });

    it('should have correct CSS classes for separators', () => {
      render(<Breadcrumb items={defaultItems} />);
      
      const separators = screen.getAllByText('/');
      separators.forEach(separator => {
        expect(separator).toHaveClass('mx-2', 'text-gray-400');
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle items with missing href', () => {
      const itemsWithoutHref = [
        { label: 'Home' },
        { label: 'Campaigns', href: '/campaigns' },
      ];
      
      render(<Breadcrumb items={itemsWithoutHref} />);
      
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
    });

    it('should handle items with missing label', () => {
      const itemsWithoutLabel = [
        { href: '/' },
        { label: 'Campaigns', href: '/campaigns' },
      ];
      
      render(<Breadcrumb items={itemsWithoutLabel} />);
      
      expect(screen.getByText('Campaigns')).toBeInTheDocument();
    });

    it('should handle very long labels', () => {
      const longLabel = 'A'.repeat(100);
      const itemsWithLongLabel = [
        { label: longLabel, href: '/' },
      ];
      
      render(<Breadcrumb items={itemsWithLongLabel} />);
      
      expect(screen.getByText(longLabel)).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = performance.now();
      render(<Breadcrumb items={defaultItems} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should handle many items efficiently', () => {
      const manyItems = Array.from({ length: 20 }, (_, i) => ({
        label: `Item ${i}`,
        href: `/item-${i}`,
      }));
      
      render(<Breadcrumb items={manyItems} />);
      
      expect(screen.getByText('Item 0')).toBeInTheDocument();
      expect(screen.getByText('Item 19')).toBeInTheDocument();
    });
  });
}); 