import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Card } from '@/components/ui/Card';

describe('Card', () => {
  afterEach(() => cleanup());

  it('renders with default props', () => {
    render(<Card>Content</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('rounded-lg', 'p-6', 'bg-white', 'border', 'border-gray-200', 'transition-all', 'duration-200');
  });

  it('applies padding variants', () => {
    render(<Card padding="sm">Small</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-4');
    cleanup();
    render(<Card padding="md">Medium</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-6');
    cleanup();
    render(<Card padding="lg">Large</Card>);
    expect(screen.getByTestId('card')).toHaveClass('p-8');
  });

  it('applies variant styles', () => {
    render(<Card variant="default">Default</Card>);
    expect(screen.getByTestId('card')).toHaveClass('bg-white', 'border-gray-200');
    cleanup();
    render(<Card variant="elevated">Elevated</Card>);
    expect(screen.getByTestId('card')).toHaveClass('shadow-lg');
    cleanup();
    render(<Card variant="outlined">Outlined</Card>);
    expect(screen.getByTestId('card')).toHaveClass('border-2');
  });

  it('handles click events', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Clickable</Card>);
    const card = screen.getByTestId('card');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalled();
    expect(card).toHaveClass('cursor-pointer');
  });

  it('is accessible by keyboard when clickable', () => {
    const handleClick = vi.fn();
    render(<Card onClick={handleClick}>Keyboard</Card>);
    const card = screen.getByTestId('card');
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalled();
  });

  it('renders complex children', () => {
    render(<Card><span>Text</span><strong>Bold</strong></Card>);
    expect(screen.getByText('Text')).toBeInTheDocument();
    expect(screen.getByText('Bold')).toBeInTheDocument();
  });
}); 