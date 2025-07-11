import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Modal } from '@/components/ui/Modal';

describe('Modal', () => {
  afterEach(() => cleanup());

  it('renders when open', () => {
    render(<Modal isOpen onClose={() => {}}>Content</Modal>);
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('does not render when closed', () => {
    render(<Modal isOpen={false} onClose={() => {}}>Hidden</Modal>);
    expect(screen.queryByText('Hidden')).not.toBeInTheDocument();
  });

  it('renders with title', () => {
    render(<Modal isOpen onClose={() => {}} title="Title">Content</Modal>);
    expect(screen.getByText('Title')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen onClose={handleClose} showCloseButton>Content</Modal>);
    fireEvent.click(screen.getByLabelText(/close modal/i));
    expect(handleClose).toHaveBeenCalled();
  });

  it('calls onClose when backdrop clicked', () => {
    const handleClose = vi.fn();
    render(<Modal isOpen onClose={handleClose}>Content</Modal>);
    const backdrop = document.querySelector('.bg-black');
    backdrop && fireEvent.click(backdrop);
    expect(handleClose).toHaveBeenCalled();
  });

  it('renders with different sizes', () => {
    ['sm', 'md', 'lg', 'xl', 'full'].forEach(size => {
      render(<Modal isOpen onClose={() => {}} size={size as any}>Sized</Modal>);
      expect(screen.getByText('Sized')).toBeInTheDocument();
      cleanup();
    });
  });

  it('renders complex children', () => {
    render(<Modal isOpen onClose={() => {}}><span>Text</span><strong>Bold</strong></Modal>);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });
}); 