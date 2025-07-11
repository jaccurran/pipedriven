import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Textarea } from '@/components/ui/Textarea'

describe('Textarea', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.clearAllMocks()
    cleanup()
  })
  describe('Rendering', () => {
    it('renders textarea correctly', () => {
      render(<Textarea placeholder="Enter text..." />)
      
      const textarea = screen.getByPlaceholderText('Enter text...')
      expect(textarea).toBeInTheDocument()
      expect(textarea).toHaveAttribute('placeholder', 'Enter text...')
    })

    it('applies custom className', () => {
      render(<Textarea className="custom-class" />)
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveClass('custom-class')
    })

    it('renders with error state', () => {
      render(<Textarea error={true} helperText="This field is required" />)
      
      const textarea = screen.getByRole('textbox')
      const helperText = screen.getByText('This field is required')
      
      expect(textarea).toHaveClass('border-red-500')
      expect(helperText).toHaveClass('text-red-600')
    })

    it('renders helper text without error', () => {
      render(<Textarea helperText="Optional helper text" />)
      
      const helperText = screen.getByText('Optional helper text')
      expect(helperText).toHaveClass('text-gray-500')
    })
  })

  describe('Functionality', () => {
    it('handles value changes', async () => {
      const user = userEvent.setup()
      const handleChange = vi.fn()
      
      render(<Textarea onChange={handleChange} />)
      
      const textarea = screen.getByRole('textbox')
      await user.type(textarea, 'Hello, world!')
      
      expect(handleChange).toHaveBeenCalledWith('Hello, world!')
    })

    it('forwards ref correctly', () => {
      const ref = React.createRef<HTMLTextAreaElement>()
      render(<Textarea ref={ref} />)
      
      expect(ref.current).toBeInstanceOf(HTMLTextAreaElement)
    })

    it('applies all standard textarea attributes', () => {
      render(
        <Textarea
          name="description"
          rows={5}
          maxLength={100}
          required
          disabled
        />
      )
      
      const textarea = screen.getByRole('textbox')
      expect(textarea).toHaveAttribute('name', 'description')
      expect(textarea).toHaveAttribute('rows', '5')
      expect(textarea).toHaveAttribute('maxLength', '100')
      expect(textarea).toHaveAttribute('required')
      expect(textarea).toBeDisabled()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <Textarea
          aria-label="Description"
          aria-describedby="description-help"
        />
      )
      
      const textarea = screen.getByLabelText('Description')
      expect(textarea).toHaveAttribute('aria-describedby', 'description-help')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(<Textarea data-testid="keyboard-textarea" />)
      
      const textarea = screen.getByTestId('keyboard-textarea')
      textarea.focus()
      
      expect(textarea).toHaveFocus()
      
      await user.type(textarea, 'Test input')
      expect(textarea).toHaveValue('Test input')
    })
  })

  describe('Styling', () => {
    it('applies default styling classes', () => {
      render(<Textarea data-testid="styling-textarea" />)
      
      const textarea = screen.getByTestId('styling-textarea')
      expect(textarea).toHaveClass(
        'flex',
        'min-h-[80px]',
        'w-full',
        'rounded-md',
        'border',
        'border-gray-300',
        'bg-white',
        'px-3',
        'py-2',
        'text-sm'
      )
    })

    it('applies focus styles', async () => {
      const user = userEvent.setup()
      
      render(<Textarea data-testid="focus-textarea" />)
      
      const textarea = screen.getByTestId('focus-textarea')
      await user.click(textarea)
      
      expect(textarea).toHaveFocus()
    })

    it('applies disabled styles', () => {
      render(<Textarea disabled data-testid="disabled-textarea" />)
      
      const textarea = screen.getByTestId('disabled-textarea')
      expect(textarea).toHaveClass('disabled:cursor-not-allowed', 'disabled:opacity-50')
      expect(textarea).toBeDisabled()
    })
  })
}) 