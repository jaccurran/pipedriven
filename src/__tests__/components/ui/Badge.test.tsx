import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { Badge } from '@/components/ui/Badge';

describe('Badge', () => {
  afterEach(() => cleanup());

  it('renders with default props', () => {
    render(<Badge>Default</Badge>);
    const badge = screen.getByText('Default');
    expect(badge).toHaveClass('bg-gray-100', 'text-gray-800');
  });

  it('applies variant styles', () => {
    render(<Badge variant="success">Success</Badge>);
    expect(screen.getByText('Success')).toHaveClass('bg-green-100', 'text-green-800');
    cleanup();
    render(<Badge variant="warning">Warning</Badge>);
    expect(screen.getByText('Warning')).toHaveClass('bg-yellow-100', 'text-yellow-800');
    cleanup();
    render(<Badge variant="danger">Danger</Badge>);
    expect(screen.getByText('Danger')).toHaveClass('bg-red-100', 'text-red-800');
    cleanup();
    render(<Badge variant="info">Info</Badge>);
    expect(screen.getByText('Info')).toHaveClass('bg-blue-100', 'text-blue-800');
  });

  it('applies size variants', () => {
    render(<Badge size="sm">Small</Badge>);
    expect(screen.getByText('Small')).toHaveClass('text-xs');
    cleanup();
    render(<Badge size="md">Medium</Badge>);
    expect(screen.getByText('Medium')).toHaveClass('text-sm');
    cleanup();
    render(<Badge size="lg">Large</Badge>);
    expect(screen.getByText('Large')).toHaveClass('text-base');
  });

  it('renders with custom className', () => {
    render(<Badge className="custom">Custom</Badge>);
    expect(screen.getByText('Custom')).toHaveClass('custom');
  });

  it('renders complex children', () => {
    render(<Badge><span>Text</span><strong>Bold</strong></Badge>);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });
}); 