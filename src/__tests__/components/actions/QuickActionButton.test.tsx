import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import { QuickActionButton } from '@/components/actions/QuickActionButton'

describe('QuickActionButton', () => {
  const mockOnClick = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
  })
  afterEach(() => {
    cleanup()
  })

  describe('Primary Actions', () => {
    it('should render Email action button', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Log email sent to John Doe')
    })

    it('should render Meeting Request action button', () => {
      render(
        <QuickActionButton
          type="MEETING_REQUEST"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting request/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Log meeting request for John Doe')
    })

    it('should render Meeting action button', () => {
      render(
        <QuickActionButton
          type="MEETING"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting/i })
      expect(button).toBeInTheDocument()
      expect(button).toHaveAttribute('aria-label', 'Log meeting with John Doe')
    })
  })

  describe('Button Interactions', () => {
    it('should call onClick when Email button is clicked', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      fireEvent.click(button)

      expect(mockOnClick).toHaveBeenCalledWith('EMAIL')
    })

    it('should call onClick when Meeting Request button is clicked', () => {
      render(
        <QuickActionButton
          type="MEETING_REQUEST"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting request/i })
      fireEvent.click(button)

      expect(mockOnClick).toHaveBeenCalledWith('MEETING_REQUEST')
    })

    it('should call onClick when Meeting button is clicked', () => {
      render(
        <QuickActionButton
          type="MEETING"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting/i })
      fireEvent.click(button)

      expect(mockOnClick).toHaveBeenCalledWith('MEETING')
    })
  })

  describe('Disabled State', () => {
    it('should disable button when disabled prop is true', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
          disabled={true}
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toBeDisabled()
    })

    it('should not call onClick when disabled button is clicked', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
          disabled={true}
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      fireEvent.click(button)

      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Loading State', () => {
    it('should show loading state when loading prop is true', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
          loading={true}
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toBeDisabled()
      expect(button).toHaveAttribute('aria-busy', 'true')
    })

    it('should not call onClick when loading button is clicked', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
          loading={true}
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      fireEvent.click(button)

      expect(mockOnClick).not.toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA attributes for Email button', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toHaveAttribute('aria-label', 'Log email sent to John Doe')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should have proper ARIA attributes for Meeting Request button', () => {
      render(
        <QuickActionButton
          type="MEETING_REQUEST"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting request/i })
      expect(button).toHaveAttribute('aria-label', 'Log meeting request for John Doe')
      expect(button).toHaveAttribute('type', 'button')
    })

    it('should have proper ARIA attributes for Meeting button', () => {
      render(
        <QuickActionButton
          type="MEETING"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /meeting/i })
      expect(button).toHaveAttribute('aria-label', 'Log meeting with John Doe')
      expect(button).toHaveAttribute('type', 'button')
    })
  })

  describe('Styling', () => {
    it('should apply custom className when provided', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
          className="custom-class"
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toHaveClass('custom-class')
    })

    it('should have proper base styling classes', () => {
      render(
        <QuickActionButton
          type="EMAIL"
          onClick={mockOnClick}
          contactName="John Doe"
        />
      )

      const button = screen.getByRole('button', { name: /email/i })
      expect(button).toHaveClass('inline-flex', 'items-center', 'gap-2')
    })
  })
}) 