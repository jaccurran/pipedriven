import React from 'react'
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { ActivityLogForm, ActivityType } from '@/components/actions/ActivityLogForm'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ActivityLogForm', () => {
  const defaultProps = {
    activityType: 'MEETING' as ActivityType,
    contactName: 'John Doe',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    initialDate: '2024-12-31', // Use a hardcoded valid date for testing
  }

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<ActivityLogForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('activity-log-form')).toHaveLength(1)
      const form = screen.getAllByTestId('activity-log-form')[0]
      expect(form).toBeInTheDocument()

      // Check date field is present and pre-filled
      const dateField = within(form).getByLabelText('Date')
      expect(dateField).toHaveValue(defaultProps.initialDate)

      // Check buttons are present
      expect(within(form).getByTestId('submit-button')).toBeInTheDocument()
      expect(within(form).getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('should show loading state when isLoading is true', () => {
      render(<ActivityLogForm {...defaultProps} isLoading={true} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const submitButton = within(form).getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
      expect(submitButton).toBeDisabled()

      // Check date input is disabled
      expect(within(form).getByLabelText('Date')).toBeDisabled()
    })

    it('should display correct title for each activity type', () => {
      const { rerender } = render(<ActivityLogForm {...defaultProps} activityType="MEETING" />)
      expect(screen.getByRole('heading', { name: /log meeting/i })).toBeInTheDocument()

      rerender(<ActivityLogForm {...defaultProps} activityType="LINKEDIN" />)
      expect(screen.getByRole('heading', { name: /log linkedin/i })).toBeInTheDocument()

      rerender(<ActivityLogForm {...defaultProps} activityType="PHONE_CALL" />)
      expect(screen.getByRole('heading', { name: /log phone call/i })).toBeInTheDocument()

      rerender(<ActivityLogForm {...defaultProps} activityType="CONFERENCE" />)
      expect(screen.getByRole('heading', { name: /log conference/i })).toBeInTheDocument()
    })

    it('should pre-fill today\'s date when no initialDate provided', () => {
      const today = new Date().toISOString().split('T')[0]
      render(<ActivityLogForm {...defaultProps} initialDate={undefined} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      expect(dateField).toHaveValue(today)
    })
  })

  describe('Form Validation', () => {
    it('should show error when date field is empty', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      const submitButton = within(form).getByTestId('submit-button')

      // Clear the date field
      await user.clear(dateField)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/date is required/i)).toBeInTheDocument()
      })
    })

    it('should show error when date is in the future', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      const submitButton = within(form).getByTestId('submit-button')

      // Set future date
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]

      await user.clear(dateField)
      await user.type(dateField, futureDateString)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument()
      })
    })

    it('should not show errors when form is valid', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const submitButton = within(form).getByTestId('submit-button')

      // Submit form with valid data (should be pre-filled)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/date is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/date cannot be in the future/i)).not.toBeInTheDocument()
      })
    })

    it('should validate on blur', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')

      // Set future date and blur
      const futureDate = new Date()
      futureDate.setDate(futureDate.getDate() + 1)
      const futureDateString = futureDate.toISOString().split('T')[0]

      await user.clear(dateField)
      await user.type(dateField, futureDateString)
      await user.tab() // Trigger blur

      await waitFor(() => {
        expect(screen.getByText(/date cannot be in the future/i)).toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with correct data when form is valid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ActivityLogForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      fireEvent.submit(form)

      expect(onSubmit).toHaveBeenCalledWith({
        type: 'MEETING',
        date: defaultProps.initialDate,
        contactName: 'John Doe',
      })
    })

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ActivityLogForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')

      // Clear required field to make form invalid
      await user.clear(dateField)
      fireEvent.submit(form)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should allow submission when form is invalid to trigger validation', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      const submitButton = within(form).getByTestId('submit-button')

      await user.clear(dateField)

      // Button should be enabled to allow validation to run
      expect(submitButton).not.toBeDisabled()

      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/date is required/i)).toBeInTheDocument()
      })
    })

    it('should submit with correct activity type for each form', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()

      const activityTypes: ActivityType[] = ['MEETING', 'LINKEDIN', 'PHONE_CALL', 'CONFERENCE']
      
      for (const activityType of activityTypes) {
        const { rerender } = render(
          <ActivityLogForm 
            {...defaultProps} 
            activityType={activityType} 
            onSubmit={onSubmit} 
          />
        )

        const form = screen.getAllByTestId('activity-log-form')[0]
        fireEvent.submit(form)

        expect(onSubmit).toHaveBeenCalledWith({
          type: activityType,
          date: defaultProps.initialDate,
          contactName: 'John Doe',
        })

        onSubmit.mockClear()
        rerender(<div />) // Clean up for next iteration
      }
    })
  })

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<ActivityLogForm {...defaultProps} onCancel={onCancel} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const cancelButton = within(form).getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should update date field when user types', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')

      await user.clear(dateField)
      await user.type(dateField, '2024-12-30')

      expect(dateField).toHaveValue('2024-12-30')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(<ActivityLogForm {...defaultProps} error="Failed to log activity" />)
      expect(screen.getByText('Failed to log activity')).toBeInTheDocument()
    })

    it('should not display error message when not provided', () => {
      render(<ActivityLogForm {...defaultProps} />)
      expect(screen.queryByText('Failed to log activity')).not.toBeInTheDocument()
    })

    it('should not display error message when error is empty string', () => {
      render(<ActivityLogForm {...defaultProps} error="" />)
      expect(screen.queryByText('Failed to log activity')).not.toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      render(<ActivityLogForm {...defaultProps} error={null} />)
      expect(screen.queryByText('Failed to log activity')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      expect(form).toHaveAttribute('role', 'form')
      expect(form).toHaveAttribute('aria-label', 'Log meeting activity')
    })

    it('should show loading state with proper ARIA attributes', () => {
      render(<ActivityLogForm {...defaultProps} isLoading={true} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const submitButton = within(form).getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })

    it('should have proper labels and form associations', () => {
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      expect(dateField).toHaveAttribute('id', 'date')

      const dateLabel = screen.getByText('Date', { selector: 'label' })
      expect(dateLabel).toHaveAttribute('for', 'date')
    })

    it('should have proper aria-describedby for error states', async () => {
      const user = userEvent.setup()
      render(<ActivityLogForm {...defaultProps} />)

      const form = screen.getAllByTestId('activity-log-form')[0]
      const dateField = within(form).getByLabelText('Date')
      const submitButton = within(form).getByTestId('submit-button')

      // Trigger error
      await user.clear(dateField)
      await user.click(submitButton)

      await waitFor(() => {
        expect(dateField).toHaveAttribute('aria-describedby', 'date-error')
        expect(screen.getByText(/date is required/i)).toHaveAttribute('id', 'date-error')
      })
    })
  })
}) 