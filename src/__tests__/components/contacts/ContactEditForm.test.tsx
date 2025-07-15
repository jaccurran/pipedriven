import React from 'react'
import { render, screen, waitFor, within, cleanup } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { ContactEditForm } from '@/components/contacts/ContactEditForm'

// Mock UI components (replace with real ones as needed)
vi.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, disabled, type, ...props }: any) => (
    <button onClick={onClick} disabled={disabled} type={type} {...props}>
      {children}
    </button>
  ),
}))

vi.mock('@/components/ui/Input', () => ({
  Input: ({ id, type, value, onChange, ...props }: any) => (
    <input id={id} type={type} value={value} onChange={onChange} {...props} />
  ),
}))

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

describe('ContactEditForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    isLoading: false,
    error: null,
    initialValues: {
      email: 'jane@example.com',
      jobTitle: 'Consultant',
      organization: 'Acme Corp',
      phone: '+1234567890',
    },
  }

  describe('Component Rendering', () => {
    it('should render form with all required fields and pre-filled values', () => {
      render(<ContactEditForm {...defaultProps} />)

      // Assert only one form exists
      expect(screen.getAllByTestId('contact-edit-form')).toHaveLength(1)
      const form = screen.getAllByTestId('contact-edit-form')[0]
      expect(form).toBeInTheDocument()

      // Check all fields are present and pre-filled
      expect(within(form).getByLabelText('Email')).toHaveValue(defaultProps.initialValues.email)
      expect(within(form).getByLabelText('Job Title')).toHaveValue(defaultProps.initialValues.jobTitle)
      expect(within(form).getByLabelText('Organization')).toHaveValue(defaultProps.initialValues.organization)
      expect(within(form).getByLabelText('Phone')).toHaveValue(defaultProps.initialValues.phone)

      // Check buttons are present
      expect(within(form).getByTestId('submit-button')).toBeInTheDocument()
      expect(within(form).getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('should show loading state when isLoading is true', () => {
      render(<ContactEditForm {...defaultProps} isLoading={true} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const submitButton = within(form).getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
      expect(submitButton).toBeDisabled()

      // Check all inputs are disabled
      expect(within(form).getByLabelText('Email')).toBeDisabled()
      expect(within(form).getByLabelText('Job Title')).toBeDisabled()
      expect(within(form).getByLabelText('Organization')).toBeDisabled()
      expect(within(form).getByLabelText('Phone')).toBeDisabled()
    })

    it('should display correct title', () => {
      render(<ContactEditForm {...defaultProps} />)

      expect(screen.getByRole('heading', { name: /edit contact details/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show validation errors for empty required fields', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const emailField = within(form).getByLabelText('Email')
      const jobTitleField = within(form).getByLabelText('Job Title')
      const organizationField = within(form).getByLabelText('Organization')
      const submitButton = within(form).getByTestId('submit-button')

      // Clear required fields
      await user.clear(emailField)
      await user.clear(jobTitleField)
      await user.clear(organizationField)

      // Submit form to trigger validation
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
        expect(screen.getByText(/job title is required/i)).toBeInTheDocument()
        expect(screen.getByText(/organization is required/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid email', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const emailField = within(form).getByLabelText('Email')
      const submitButton = within(form).getByTestId('submit-button')

      // Enter invalid email
      await user.clear(emailField)
      await user.type(emailField, 'not-an-email')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show validation error for invalid phone if present', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const phoneField = within(form).getByLabelText('Phone')
      const submitButton = within(form).getByTestId('submit-button')

      // Enter invalid phone
      await user.clear(phoneField)
      await user.type(phoneField, 'badphone')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/please enter a valid phone number/i)).toBeInTheDocument()
      })
    })

    it('should not show errors when form is valid', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const submitButton = within(form).getByTestId('submit-button')

      // Submit form with valid data (should be pre-filled)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/valid/i)).not.toBeInTheDocument()
      })
    })

    it('should allow empty phone field (optional)', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const phoneField = within(form).getByLabelText('Phone')
      const submitButton = within(form).getByTestId('submit-button')

      // Clear phone field (optional)
      await user.clear(phoneField)
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.queryByText(/phone.*required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/valid phone number/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ContactEditForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const submitButton = within(form).getByTestId('submit-button')

      await user.click(submitButton)

      expect(onSubmit).toHaveBeenCalledWith(defaultProps.initialValues)
    })

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ContactEditForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const emailField = within(form).getByLabelText('Email')
      const submitButton = within(form).getByTestId('submit-button')

      // Clear required field to make form invalid
      await user.clear(emailField)
      await user.click(submitButton)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should allow submission when form is invalid to trigger validation', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const emailField = within(form).getByLabelText('Email')
      const submitButton = within(form).getByTestId('submit-button')

      await user.clear(emailField)

      // Button should be enabled to allow validation to run
      expect(submitButton).not.toBeDisabled()

      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })
  })

  describe('User Interactions', () => {
    it('should call onCancel when cancel button is clicked', async () => {
      const user = userEvent.setup()
      const onCancel = vi.fn()
      render(<ContactEditForm {...defaultProps} onCancel={onCancel} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const cancelButton = within(form).getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should update form fields when user types', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const emailField = within(form).getByLabelText('Email')

      await user.clear(emailField)
      await user.type(emailField, 'newemail@example.com')

      expect(emailField).toHaveValue('newemail@example.com')
    })
  })

  describe('Error Handling', () => {
    it('should display error message when provided', () => {
      render(<ContactEditForm {...defaultProps} error="Failed to update contact" />)
      expect(screen.getByText('Failed to update contact')).toBeInTheDocument()
    })

    it('should not display error message when not provided', () => {
      render(<ContactEditForm {...defaultProps} />)
      expect(screen.queryByText('Failed to update contact')).not.toBeInTheDocument()
    })

    it('should not display error message when error is empty string', () => {
      render(<ContactEditForm {...defaultProps} error="" />)
      expect(screen.queryByText('Failed to update contact')).not.toBeInTheDocument()
    })

    it('should not display error message when error is null', () => {
      render(<ContactEditForm {...defaultProps} error={null} />)
      expect(screen.queryByText('Failed to update contact')).not.toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper form structure', () => {
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      expect(form).toHaveAttribute('role', 'form')
      expect(form).toHaveAttribute('aria-label', 'Edit contact details')
    })

    it('should show loading state with proper ARIA attributes', () => {
      render(<ContactEditForm {...defaultProps} isLoading={true} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      const submitButton = within(form).getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })

    it('should have proper labels and form associations', () => {
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getAllByTestId('contact-edit-form')[0]
      
      // Check email field
      const emailField = within(form).getByLabelText('Email')
      expect(emailField).toHaveAttribute('id', 'email')
      const emailLabel = screen.getByText('Email', { selector: 'label' })
      expect(emailLabel).toHaveAttribute('for', 'email')

      // Check job title field
      const jobTitleField = within(form).getByLabelText('Job Title')
      expect(jobTitleField).toHaveAttribute('id', 'jobTitle')
      const jobTitleLabel = screen.getByText('Job Title', { selector: 'label' })
      expect(jobTitleLabel).toHaveAttribute('for', 'jobTitle')

      // Check organization field
      const organizationField = within(form).getByLabelText('Organization')
      expect(organizationField).toHaveAttribute('id', 'organization')
      const organizationLabel = screen.getByText('Organization', { selector: 'label' })
      expect(organizationLabel).toHaveAttribute('for', 'organization')

      // Check phone field
      const phoneField = within(form).getByLabelText('Phone')
      expect(phoneField).toHaveAttribute('id', 'phone')
      const phoneLabel = screen.getByText('Phone', { selector: 'label' })
      expect(phoneLabel).toHaveAttribute('for', 'phone')
    })
  })
}) 