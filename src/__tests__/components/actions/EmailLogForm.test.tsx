import React from 'react'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { EmailLogForm } from '@/components/actions/EmailLogForm'

// Mock the API call
vi.mock('@/lib/utils', () => ({
  cn: (...classes: string[]) => classes.filter(Boolean).join(' '),
}))

describe('EmailLogForm', () => {
  const mockContactName = 'John Doe'
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    cleanup()
  })

  afterEach(() => {
    cleanup()
  })

  describe('Component Rendering', () => {
    it('should render with pre-filled contact data', () => {
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Check that contact name is pre-filled
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument()
      
      // Check that form fields are present
      expect(screen.getByLabelText(/to whom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date sent/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/responded/i)).toBeInTheDocument()
    })

    it('should render with default subject line', () => {
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Check that subject has default value
      const subjectInput = screen.getByLabelText(/subject/i) as HTMLInputElement
      expect(subjectInput.value).toContain('Follow up from')
    })

    it('should render with today as default date', () => {
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const today = new Date().toISOString().split('T')[0]
      const dateInput = screen.getByLabelText(/date sent/i) as HTMLInputElement
      expect(dateInput.value).toBe(today)
    })
  })

  describe('Form Validation', () => {
    it('should validate required fields', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Clear required fields to trigger validation
      const toWhomInput = screen.getByLabelText(/to whom/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      
      await user.clear(toWhomInput)
      await user.clear(subjectInput)

      // Try to submit
      const form = screen.getByTestId('email-log-form')
      fireEvent.submit(form)

      // Check for validation errors
      expect(screen.getByText(/to whom is required/i)).toBeInTheDocument()
      expect(screen.getByText(/subject is required/i)).toBeInTheDocument()
      
      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate subject length', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Enter invalid subject (too long)
      const subjectInput = screen.getByLabelText(/subject/i)
      await user.clear(subjectInput)
      await user.type(subjectInput, 'a'.repeat(201)) // Too long

      // Try to submit
      const form = screen.getByTestId('email-log-form')
      fireEvent.submit(form)

      // Check for validation error
      expect(screen.getByText(/subject must be less than 200 characters/i)).toBeInTheDocument()
      
      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })

    it('should validate date is not in the future', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialDate="2025-12-31" // Future date
        />
      )

      // Try to submit
      const form = screen.getByTestId('email-log-form')
      fireEvent.submit(form)

      // Check for validation error
      expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument()
      
      // Should not call onSubmit
      expect(mockOnSubmit).not.toHaveBeenCalled()
    })
  })

  describe('Form Submission', () => {
    it('should submit email activity data with correct format', async () => {
      const user = userEvent.setup()
      const today = new Date().toISOString().split('T')[0]
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          initialDate={today}
        />
      )

      // Fill in form
      const toWhomInput = screen.getByLabelText(/to whom/i)
      const subjectInput = screen.getByLabelText(/subject/i)
      const respondedCheckbox = screen.getByLabelText(/responded/i)

      await user.clear(toWhomInput)
      await user.type(toWhomInput, 'Jane Smith')
      await user.clear(subjectInput)
      await user.type(subjectInput, 'Test Subject')
      await user.click(respondedCheckbox)

      // Submit form
      const form = screen.getByTestId('email-log-form')
      fireEvent.submit(form)

      // Debug: Check if there are any validation errors
      const errorMessages = screen.queryAllByText(/required|invalid|error/i)
      if (errorMessages.length > 0) {
        console.log('Validation errors found:', errorMessages.map(el => el.textContent))
      }

      // Check that onSubmit was called with correct data
      expect(mockOnSubmit).toHaveBeenCalledWith({
        toWhom: 'Jane Smith',
        subject: 'Test Subject',
        dateSent: expect.any(String),
        responded: true
      })
    })

    it('should handle form submission errors gracefully', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          error="Failed to log email activity"
        />
      )

      // Check for error message
      expect(screen.getByText(/failed to log email activity/i)).toBeInTheDocument()
    })
  })

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      const cancelButton = screen.getByRole('button', { name: /cancel/i })
      await user.click(cancelButton)

      expect(mockOnCancel).toHaveBeenCalledTimes(1)
    })

    it('should show loading state during submission', () => {
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
          isLoading={true}
        />
      )

      const submitButton = screen.getByRole('button', { name: /log email/i })
      expect(submitButton).toBeDisabled()
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      expect(screen.getByRole('form')).toHaveAttribute('aria-label', 'Log email activity')
      expect(screen.getByLabelText(/to whom/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/subject/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/date sent/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/responded/i)).toBeInTheDocument()
    })

    it('should be keyboard navigable', async () => {
      const user = userEvent.setup()
      
      render(
        <EmailLogForm
          contactName={mockContactName}
          onSubmit={mockOnSubmit}
          onCancel={mockOnCancel}
        />
      )

      // Tab through form elements
      await user.tab()
      expect(screen.getByLabelText(/to whom/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/subject/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/date sent/i)).toHaveFocus()
      
      await user.tab()
      expect(screen.getByLabelText(/responded/i)).toHaveFocus()
    })
  })
}) 