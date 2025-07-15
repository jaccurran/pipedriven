import React from 'react'
import { render, screen, waitFor, cleanup, within, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi, describe, it, expect, afterEach } from 'vitest'
import { ContactEditForm } from '@/components/actions/ContactEditForm'

// Mock UI components
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

describe('ContactEditForm', () => {
  const defaultProps = {
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
    contact: {
      name: 'John Doe',
      email: 'john@example.com',
      jobTitle: 'Software Engineer',
      organisation: 'Tech Corp',
      phone: '+1234567890',
    },
  }

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  describe('Component Rendering', () => {
    it('should render form with all required fields', () => {
      render(<ContactEditForm {...defaultProps} />)
      
      expect(screen.getByTestId('contact-edit-form')).toBeInTheDocument()
      expect(screen.getByLabelText(/email/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/job title/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/organization/i)).toBeInTheDocument()
      expect(screen.getByLabelText(/phone/i)).toBeInTheDocument()
      expect(screen.getByTestId('submit-button')).toBeInTheDocument()
      expect(screen.getByTestId('cancel-button')).toBeInTheDocument()
    })

    it('should pre-fill contact data', () => {
      render(<ContactEditForm {...defaultProps} />)
      
      expect(screen.getByLabelText(/email/i)).toHaveValue('john@example.com')
      expect(screen.getByLabelText(/job title/i)).toHaveValue('Software Engineer')
      expect(screen.getByLabelText(/organization/i)).toHaveValue('Tech Corp')
      expect(screen.getByLabelText(/phone/i)).toHaveValue('+1234567890')
    })

    it('should show loading state when isLoading is true', () => {
      render(<ContactEditForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
      expect(submitButton).toBeDisabled()
    })

    it('should display correct title', () => {
      render(<ContactEditForm {...defaultProps} />)
      
      expect(screen.getByRole('heading', { name: /edit contact/i })).toBeInTheDocument()
    })
  })

  describe('Form Validation', () => {
    it('should show error when email is invalid', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const emailField = screen.getByLabelText(/email/i)
      const form = screen.getByTestId('contact-edit-form')

      await user.clear(emailField)
      await user.type(emailField, 'invalid-email')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/valid email address/i)).toBeInTheDocument()
      })
    })

    it('should show error when email is empty', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const emailField = screen.getByLabelText(/email/i)
      const form = screen.getByTestId('contact-edit-form')

      await user.clear(emailField)
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.getByText(/email is required/i)).toBeInTheDocument()
      })
    })

    it('should not show errors when form is valid', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const form = screen.getByTestId('contact-edit-form')
      fireEvent.submit(form)

      await waitFor(() => {
        expect(screen.queryByText(/is required/i)).not.toBeInTheDocument()
        expect(screen.queryByText(/valid email/i)).not.toBeInTheDocument()
      })
    })
  })

  describe('Form Submission', () => {
    it('should call onSubmit with form data when form is valid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ContactEditForm {...defaultProps} onSubmit={onSubmit} />)

      const form = screen.getByTestId('contact-edit-form')
      fireEvent.submit(form)

      expect(onSubmit).toHaveBeenCalledWith({
        email: 'john@example.com',
        jobTitle: 'Software Engineer',
        organisation: 'Tech Corp',
        phone: '+1234567890',
      })
    })

    it('should not call onSubmit when form is invalid', async () => {
      const user = userEvent.setup()
      const onSubmit = vi.fn()
      render(<ContactEditForm {...defaultProps} onSubmit={onSubmit} />)

      const emailField = screen.getByLabelText(/email/i)
      const form = screen.getByTestId('contact-edit-form')

      await user.clear(emailField)
      fireEvent.submit(form)

      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('should allow submission when form is invalid to trigger validation', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const emailField = screen.getByLabelText(/email/i)
      const form = screen.getByTestId('contact-edit-form')

      await user.clear(emailField)
      
      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).not.toBeDisabled()
      
      fireEvent.submit(form)
      
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

      const cancelButton = screen.getByTestId('cancel-button')
      await user.click(cancelButton)

      expect(onCancel).toHaveBeenCalled()
    })

    it('should update form fields when user types', async () => {
      const user = userEvent.setup()
      render(<ContactEditForm {...defaultProps} />)

      const emailField = screen.getByLabelText(/email/i)
      const jobTitleField = screen.getByLabelText(/job title/i)

      await user.clear(emailField)
      await user.type(emailField, 'jane@example.com')
      await user.clear(jobTitleField)
      await user.type(jobTitleField, 'Senior Developer')

      expect(emailField).toHaveValue('jane@example.com')
      expect(jobTitleField).toHaveValue('Senior Developer')
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
      
      const form = screen.getByTestId('contact-edit-form')
      expect(form).toHaveAttribute('role', 'form')
      expect(form).toHaveAttribute('aria-label')
    })

    it('should show loading state with proper ARIA attributes', () => {
      render(<ContactEditForm {...defaultProps} isLoading={true} />)
      
      const submitButton = screen.getByTestId('submit-button')
      expect(submitButton).toHaveAttribute('aria-busy', 'true')
    })

    it('should have proper labels and form associations', () => {
      render(<ContactEditForm {...defaultProps} />)
      
      const form = screen.getByTestId('contact-edit-form')
      const emailField = within(form).getByLabelText(/email/i)
      const jobTitleField = within(form).getByLabelText(/job title/i)
      const organisationField = within(form).getByLabelText(/organization/i)
      const phoneField = within(form).getByLabelText(/phone/i)

      expect(emailField).toHaveAttribute('id')
      expect(jobTitleField).toHaveAttribute('id')
      expect(organisationField).toHaveAttribute('id')
      expect(phoneField).toHaveAttribute('id')
    })
  })
}) 