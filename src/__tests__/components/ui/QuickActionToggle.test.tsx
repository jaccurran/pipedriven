import React from 'react'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { QuickActionToggle } from '@/components/ui/QuickActionToggle'

afterEach(cleanup)

describe('QuickActionToggle', () => {
  const mockOnModeChange = vi.fn()

  beforeEach(() => {
    mockOnModeChange.mockClear()
  })

  it('renders with simple mode selected by default', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
      />
    )

    expect(screen.getByText('Quick Actions:')).toBeInTheDocument()
    expect(screen.getByText('Simple')).toBeInTheDocument()
    expect(screen.getByText('Detailed')).toBeInTheDocument()
    expect(screen.getByText('One-click logging')).toBeInTheDocument()
  })

  it('renders with detailed mode selected', () => {
    render(
      <QuickActionToggle
        mode="DETAILED"
        onModeChange={mockOnModeChange}
      />
    )

    expect(screen.getByText('Modal with notes')).toBeInTheDocument()
  })

  it('calls onModeChange when simple mode button is clicked', () => {
    render(
      <QuickActionToggle
        mode="DETAILED"
        onModeChange={mockOnModeChange}
      />
    )

    const simpleButton = screen.getByTestId('simple-mode-toggle')
    fireEvent.click(simpleButton)

    expect(mockOnModeChange).toHaveBeenCalledWith('SIMPLE')
    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
  })

  it('calls onModeChange when detailed mode button is clicked', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
      />
    )

    const detailedButton = screen.getByTestId('detailed-mode-toggle')
    fireEvent.click(detailedButton)

    expect(mockOnModeChange).toHaveBeenCalledWith('DETAILED')
    expect(mockOnModeChange).toHaveBeenCalledTimes(1)
  })

  it('applies correct styling for active simple mode', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
      />
    )

    const simpleButton = screen.getByTestId('simple-mode-toggle')
    const detailedButton = screen.getByTestId('detailed-mode-toggle')

    expect(simpleButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm')
    expect(detailedButton).not.toHaveClass('bg-white', 'shadow-sm')
  })

  it('applies correct styling for active detailed mode', () => {
    render(
      <QuickActionToggle
        mode="DETAILED"
        onModeChange={mockOnModeChange}
      />
    )

    const simpleButton = screen.getByTestId('simple-mode-toggle')
    const detailedButton = screen.getByTestId('detailed-mode-toggle')

    expect(detailedButton).toHaveClass('bg-white', 'text-gray-900', 'shadow-sm')
    expect(simpleButton).not.toHaveClass('bg-white', 'shadow-sm')
  })

  it('applies custom className when provided', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
        className="custom-class"
      />
    )

    const container = screen.getByText('Quick Actions:').parentElement
    expect(container).toHaveClass('custom-class')
  })

  it('shows correct description text for simple mode', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
      />
    )

    expect(screen.getByText('One-click logging')).toBeInTheDocument()
    expect(screen.queryByText('Modal with notes')).not.toBeInTheDocument()
  })

  it('shows correct description text for detailed mode', () => {
    render(
      <QuickActionToggle
        mode="DETAILED"
        onModeChange={mockOnModeChange}
      />
    )

    expect(screen.getByText('Modal with notes')).toBeInTheDocument()
    expect(screen.queryByText('One-click logging')).not.toBeInTheDocument()
  })

  it('has proper accessibility attributes', () => {
    render(
      <QuickActionToggle
        mode="SIMPLE"
        onModeChange={mockOnModeChange}
      />
    )

    const simpleButton = screen.getByTestId('simple-mode-toggle')
    const detailedButton = screen.getByTestId('detailed-mode-toggle')

    expect(simpleButton).toHaveAttribute('type', 'button')
    expect(detailedButton).toHaveAttribute('type', 'button')
  })
}) 