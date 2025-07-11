import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { Select } from '@/components/ui/Select';

const options = [
  { value: 'a', label: 'Option A' },
  { value: 'b', label: 'Option B' },
  { value: 'c', label: 'Option C' },
];

describe('Select', () => {
  afterEach(() => cleanup());

  it('renders with label', () => {
    render(<Select label="Test" options={options} value="" onChange={() => {}} />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Select options={options} value="" onChange={() => {}} error="Error!" />);
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('applies required and disabled', () => {
    render(<Select options={options} value="" onChange={() => {}} required disabled label="Test" />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('calls onChange when option selected', () => {
    const handleChange = vi.fn();
    render(<Select options={options} value="" onChange={handleChange} />);
    const button = screen.getByRole('button');
    fireEvent.click(button);
    fireEvent.click(screen.getByText('Option B'));
    expect(handleChange).toHaveBeenCalledWith('b');
  });

  it('filters options when searchable', () => {
    render(<Select options={options} value="" onChange={() => {}} searchable />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.change(screen.getByPlaceholderText('Search...'), { target: { value: 'C' } });
    expect(screen.getByText('Option C')).toBeInTheDocument();
  });

  it('renders with custom className', () => {
    render(<Select options={options} value="" onChange={() => {}} className="custom" />);
    expect(screen.getByRole('combobox')).toHaveClass('custom');
  });

  it('handles edge cases', () => {
    render(<Select options={[]} value="" onChange={() => {}} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByText('No options found.')).toBeInTheDocument();
  });
}); 