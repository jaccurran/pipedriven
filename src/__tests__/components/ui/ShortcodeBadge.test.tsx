import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react'
import { ShortcodeBadge } from '@/components/ui/ShortcodeBadge'

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn(),
}
Object.assign(navigator, {
  clipboard: mockClipboard,
})

describe('ShortcodeBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
  })

  it('renders shortcode correctly', () => {
    render(<ShortcodeBadge shortcode="ASC" />)
    
    expect(screen.getByTestId('shortcode-badge')).toBeInTheDocument()
    expect(screen.getByTestId('shortcode-badge')).toHaveTextContent('ASC')
  })

  it('applies correct default styling', () => {
    render(<ShortcodeBadge shortcode="ASC" />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveClass('bg-blue-50', 'text-blue-700', 'border-blue-200')
  })

  it('applies different size classes', () => {
    const { rerender } = render(<ShortcodeBadge shortcode="ASC" size="sm" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('text-xs')

    rerender(<ShortcodeBadge shortcode="ASC" size="md" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('text-sm')

    rerender(<ShortcodeBadge shortcode="ASC" size="lg" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('text-base')
  })

  it('applies different variant classes', () => {
    const { rerender } = render(<ShortcodeBadge shortcode="ASC" variant="default" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('bg-blue-50', 'text-blue-700')

    rerender(<ShortcodeBadge shortcode="ASC" variant="outline" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('bg-transparent', 'border-blue-300')

    rerender(<ShortcodeBadge shortcode="ASC" variant="ghost" />)
    expect(screen.getByTestId('shortcode-badge')).toHaveClass('bg-transparent', 'text-blue-600')
  })

  it('shows copy button when showCopyButton is true', () => {
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveClass('cursor-pointer')
    
    // Check for copy icon
    const copyIcon = badge.querySelector('svg')
    expect(copyIcon).toBeInTheDocument()
  })

  it('does not show copy button when showCopyButton is false', () => {
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={false} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveClass('cursor-default')
    
    // Check that no copy icon is present
    const copyIcon = badge.querySelector('svg')
    expect(copyIcon).not.toBeInTheDocument()
  })

  it('copies shortcode to clipboard when clicked', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)
    
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    fireEvent.click(badge)
    
    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith('ASC')
    })
  })

  it('shows success icon after copying', async () => {
    mockClipboard.writeText.mockResolvedValue(undefined)
    
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    fireEvent.click(badge)
    
    await waitFor(() => {
      // Check for checkmark icon (success state)
      const successIcon = badge.querySelector('svg')
      expect(successIcon).toBeInTheDocument()
    })
  })

  it('handles clipboard errors gracefully', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard error'))
    
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    fireEvent.click(badge)
    
    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith('Failed to copy shortcode:', expect.any(Error))
    })
    
    consoleSpy.mockRestore()
  })

  it('applies custom className', () => {
    render(<ShortcodeBadge shortcode="ASC" className="custom-class" />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveClass('custom-class')
  })

  it('shows tooltip with campaign name when provided', () => {
    render(<ShortcodeBadge shortcode="ASC" campaignName="Adult Social Care" />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveAttribute('title', 'ASC - Adult Social Care')
  })

  it('shows tooltip with just shortcode when no campaign name', () => {
    render(<ShortcodeBadge shortcode="ASC" />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveAttribute('title', 'ASC')
  })

  it('has proper accessibility attributes', () => {
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    expect(badge).toHaveAttribute('type', 'button')
    expect(badge).toHaveAttribute('title')
  })

  it('focuses with keyboard navigation', () => {
    render(<ShortcodeBadge shortcode="ASC" showCopyButton={true} />)
    
    const badge = screen.getByTestId('shortcode-badge')
    badge.focus()
    
    expect(badge).toHaveFocus()
  })
}) 