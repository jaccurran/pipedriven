import React from 'react';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Slideover } from '@/components/ui/Slideover';

// Mock createPortal
vi.mock('react-dom', () => ({
  createPortal: (children: React.ReactNode) => children,
}));

describe('Slideover', () => {
  const defaultProps = {
    isOpen: false,
    onClose: vi.fn(),
    title: 'Test Slideover',
    children: <div>Test content</div>,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock document.body for portal
    document.body.innerHTML = '<div id="root"></div>';
  });

  afterEach(() => {
    cleanup();
    // Reset body overflow
    document.body.style.overflow = 'unset';
  });

  describe('Rendering', () => {
    it('should not render when closed', () => {
      render(<Slideover {...defaultProps} isOpen={false} />);
      
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(screen.queryByText('Test Slideover')).not.toBeInTheDocument();
    });

    it('should render when open', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.getByText('Test Slideover')).toBeInTheDocument();
      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      render(<Slideover {...defaultProps} isOpen={true} title="Custom Title" />);
      
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should render without title when not provided', () => {
      const { title, ...propsWithoutTitle } = defaultProps;
      render(<Slideover {...propsWithoutTitle} isOpen={true} />);
      
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should render children content', () => {
      const customContent = (
        <div>
          <h2>Custom Header</h2>
          <p>Custom paragraph</p>
          <button>Custom button</button>
        </div>
      );
      
      render(<Slideover {...defaultProps} isOpen={true} children={customContent} />);
      
      expect(screen.getByText('Custom Header')).toBeInTheDocument();
      expect(screen.getByText('Custom paragraph')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: 'Custom button' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have correct ARIA attributes when open', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-modal', 'true');
      expect(dialog).toHaveAttribute('aria-labelledby');
    });

    it('should have proper heading structure when title is provided', () => {
      render(<Slideover {...defaultProps} isOpen={true} title="Test Title" />);
      
      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toBeInTheDocument();
      expect(heading).toHaveTextContent('Test Title');
    });

    it('should have close button with proper accessibility', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      const closeButton = screen.getByRole('button', { name: /close slideover/i });
      expect(closeButton).toBeInTheDocument();
      expect(closeButton).toHaveAttribute('aria-label', 'Close slideover');
    });
  });

  describe('Interactions', () => {
    it('should call onClose when close button is clicked', () => {
      const onClose = vi.fn();
      render(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      const closeButton = screen.getByRole('button', { name: /close slideover/i });
      fireEvent.click(closeButton);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should call onClose when backdrop is clicked', () => {
      const onClose = vi.fn();
      render(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
      fireEvent.click(backdrop!);
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when slideover content is clicked', () => {
      const onClose = vi.fn();
      render(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      const content = screen.getByText('Test content');
      fireEvent.click(content);
      
      expect(onClose).not.toHaveBeenCalled();
    });

    it('should call onClose when Escape key is pressed', () => {
      const onClose = vi.fn();
      render(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Escape' });
      
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('should not call onClose when other keys are pressed', () => {
      const onClose = vi.fn();
      render(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      fireEvent.keyDown(document, { key: 'Enter' });
      fireEvent.keyDown(document, { key: 'Tab' });
      fireEvent.keyDown(document, { key: 'Space' });
      
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Styling', () => {
    it('should have correct CSS classes for dialog', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveClass('fixed', 'inset-0', 'z-50', 'overflow-hidden');
    });

    it('should have correct CSS classes for backdrop', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      const backdrop = screen.getByRole('dialog').querySelector('[aria-hidden="true"]');
      expect(backdrop).toHaveClass('fixed');
      expect(backdrop).toHaveClass('inset-0');
      expect(backdrop).toHaveStyle({ backgroundColor: 'rgba(0, 0, 0, 0.5)' });
    });

    it('should have correct CSS classes for slideover container', () => {
      render(<Slideover {...defaultProps} isOpen={true} />);
      
      const container = screen.getByRole('dialog').querySelector('[tabindex="-1"]');
      expect(container).toHaveClass('absolute', 'inset-y-0', 'flex', 'flex-col', 'bg-white', 'shadow-xl');
    });
  });

  describe('Edge Cases', () => {
    it('should handle rapid open/close cycles', () => {
      const onClose = vi.fn();
      const { rerender } = render(<Slideover {...defaultProps} isOpen={false} onClose={onClose} />);
      
      // Rapidly open and close
      rerender(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      rerender(<Slideover {...defaultProps} isOpen={false} onClose={onClose} />);
      rerender(<Slideover {...defaultProps} isOpen={true} onClose={onClose} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('should handle missing title gracefully', () => {
      const { title, ...propsWithoutTitle } = defaultProps;
      render(<Slideover {...propsWithoutTitle} isOpen={true} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      expect(screen.queryByRole('heading')).not.toBeInTheDocument();
    });

    it('should handle empty children', () => {
      render(<Slideover {...defaultProps} isOpen={true} children={null} />);
      
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render quickly', () => {
      const start = performance.now();
      render(<Slideover {...defaultProps} isOpen={true} />);
      const end = performance.now();
      expect(end - start).toBeLessThan(100);
    });

    it('should handle many re-renders', () => {
      const { rerender } = render(<Slideover {...defaultProps} isOpen={true} />);
      
      for (let i = 0; i < 10; i++) {
        rerender(<Slideover {...defaultProps} isOpen={true} title={`Title ${i}`} />);
      }
      
      expect(screen.getByText('Title 9')).toBeInTheDocument();
    });
  });
}); 